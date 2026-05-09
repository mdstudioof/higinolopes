import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Client ────────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Server Setup ────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });
  const PORT = 3000;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  async function getProducts() {
    const { data } = await supabase.from("products").select("*").order("name");
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
    }));
  }

  async function getPendingOrders() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("status", "pending")
      .order("number");
    return (data || []).map(mapOrder);
  }

  async function getUsers() {
    const { data } = await supabase
      .from("app_users")
      .select("id, email, name, role")
      .neq("role", "admin");
    return data || [];
  }

  async function getSettings() {
    const { data } = await supabase
      .from("settings")
      .select("logo_url")
      .eq("id", 1)
      .single();
    return { logoUrl: data?.logo_url || "" };
  }

  function mapOrder(o: any) {
    return {
      id: o.id,
      number: o.number,
      items: (o.order_items || []).map((i: any) => ({
        productId: i.product_id,
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity,
      })),
      total: Number(o.total),
      status: o.status,
      createdAt: o.created_at,
      finalizedAt: o.finalized_at,
      attendantId: o.attendant_id,
      attendantName: o.attendant_name,
    };
  }

  // ─── Socket.IO ────────────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    console.log("Usuário conectado:", socket.id);

    // Envia dados iniciais
    socket.emit("products:update", await getProducts());
    socket.emit("orders:update", await getPendingOrders());
    socket.emit("users:update", await getUsers());
    socket.emit("settings:update", await getSettings());

    // ── Auth ────────────────────────────────────────────────────────────────
    socket.on("auth:login", async ({ email, password }, callback) => {
      const { data: user } = await supabase
        .from("app_users")
        .select("id, email, name, role")
        .eq("email", email)
        .eq("password", password)
        .single();

      if (user) {
        callback({ success: true, user });
      } else {
        callback({ success: false, error: "E-mail ou senha incorretos." });
      }
    });

    // ── Settings ────────────────────────────────────────────────────────────
    socket.on("settings:update", async (newSettings, callback) => {
      const { error } = await supabase
        .from("settings")
        .update({ logo_url: newSettings.logoUrl })
        .eq("id", 1);

      if (!error) {
        const settings = await getSettings();
        io.emit("settings:update", settings);
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false });
      }
    });

    // ── Users ───────────────────────────────────────────────────────────────
    socket.on("user:create", async (user, callback) => {
      const { data: existing } = await supabase
        .from("app_users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (existing) {
        if (callback) callback({ success: false, error: "E-mail já está em uso." });
        return;
      }

      const { data: newUser, error } = await supabase
        .from("app_users")
        .insert({
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
        })
        .select("id, email, name, role")
        .single();

      if (!error && newUser) {
        io.emit("users:update", await getUsers());
        if (callback) callback({ success: true, user: newUser });
      } else {
        if (callback) callback({ success: false, error: "Erro ao criar usuário." });
      }
    });

    socket.on("user:delete", async (userId) => {
      await supabase.from("app_users").delete().eq("id", userId);
      io.emit("users:update", await getUsers());
    });

    // ── Products ────────────────────────────────────────────────────────────
    socket.on("product:create", async (product) => {
      await supabase.from("products").insert({
        name: product.name,
        price: product.price,
      });
      io.emit("products:update", await getProducts());
    });

    socket.on("product:delete", async (productId) => {
      await supabase.from("products").delete().eq("id", productId);
      io.emit("products:update", await getProducts());
    });

    // ── Orders ──────────────────────────────────────────────────────────────
    socket.on("order:create", async (order, callback) => {
      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert({
          total: order.total,
          status: "pending",
          attendant_id: order.attendantId || null,
          attendant_name: order.attendantName || null,
        })
        .select()
        .single();

      if (error || !newOrder) {
        if (callback) callback(null);
        return;
      }

      // Inserir itens do pedido
      if (order.items && order.items.length > 0) {
        await supabase.from("order_items").insert(
          order.items.map((item: any) => ({
            order_id: newOrder.id,
            product_id: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          }))
        );
      }

      const pendingOrders = await getPendingOrders();
      io.emit("orders:update", pendingOrders);

      const builtOrder = pendingOrders.find((o) => o.id === newOrder.id);
      io.emit("notification", {
        message: `Novo pedido #${builtOrder?.number || newOrder.number}`,
      });

      if (callback) callback(builtOrder || mapOrder({ ...newOrder, order_items: [] }));
    });

    socket.on("order:finalize", async (orderId) => {
      await supabase
        .from("orders")
        .update({ status: "finalized", finalized_at: new Date().toISOString() })
        .eq("id", orderId);

      io.emit("orders:update", await getPendingOrders());

      const { data: finalized } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (finalized) io.emit("sales:update", [mapOrder({ ...finalized, order_items: [] })]);
    });

    socket.on("order:cancel", async (orderId) => {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      io.emit("orders:update", await getPendingOrders());
    });

    socket.on("disconnect", () => {
      console.log("Usuário desconectado");
    });
  });

  // ─── API Routes (Reports) ─────────────────────────────────────────────────
  app.get("/api/reports/daily", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const attendantId = req.query.attendantId as string | undefined;

    let query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("status", "finalized")
      .gte("finalized_at", `${today}T00:00:00Z`)
      .lte("finalized_at", `${today}T23:59:59Z`);

    if (attendantId) query = query.eq("attendant_id", attendantId);

    const { data: sales } = await query;
    const mapped = (sales || []).map(mapOrder);
    const total = mapped.reduce((acc, s) => acc + s.total, 0);
    res.json({ sales: mapped, total });
  });

  app.get("/api/reports/monthly", async (req, res) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const attendantId = req.query.attendantId as string | undefined;

    let query = supabase
      .from("orders")
      .select("total, finalized_at, attendant_id")
      .eq("status", "finalized")
      .gte("finalized_at", firstDay)
      .lte("finalized_at", lastDay);

    if (attendantId) query = query.eq("attendant_id", attendantId);

    const { data: sales } = await query;

    const byDay: Record<string, number> = {};
    let total = 0;
    for (const s of sales || []) {
      const day = (s.finalized_at as string).split("T")[0];
      byDay[day] = (byDay[day] || 0) + Number(s.total);
      total += Number(s.total);
    }

    res.json({ byDay, total });
  });

  // ─── Vite (dev) / Static (prod) ───────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error(">>> ERRO FATAL AO INICIAR SERVIDOR:", err);
  process.exit(1);
});
