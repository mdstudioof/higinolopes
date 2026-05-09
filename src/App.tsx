import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { User, Product, Order } from "@/types";
import Login from "@/components/Login";
import AttendantArea from "@/components/AttendantArea";
import CashierArea from "@/components/CashierArea";
import AdminArea from "@/components/AdminArea";
import { LogOut, Croissant } from "lucide-react";
import { Button } from "@/components/ui/button";

function mapOrder(o: any): Order {
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<{ logoUrl: string }>({ logoUrl: "" });

  // ── Fetch inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchInitial() {
      const [{ data: prods }, { data: ords }, { data: sets }] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("orders").select("*, order_items(*)").eq("status", "pending").order("number"),
        supabase.from("settings").select("logo_url").eq("id", 1).single(),
      ]);
      setProducts((prods || []).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) })));
      setOrders((ords || []).map(mapOrder));
      setSettings({ logoUrl: sets?.logo_url || "" });
    }
    fetchInitial();
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    // Produtos em tempo real
    const productChannel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, async () => {
        const { data } = await supabase.from("products").select("*").order("name");
        setProducts((data || []).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price) })));
      })
      .subscribe();

    // Pedidos em tempo real
    const orderChannel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (payload) => {
        // Notificação de novo pedido
        if (payload.eventType === "INSERT") {
          toast.info(`Novo pedido #${payload.new.number}`);
        }
        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("status", "pending")
          .order("number");
        setOrders((data || []).map(mapOrder));
      })
      .subscribe();

    // Configurações em tempo real
    const settingsChannel = supabase
      .channel("settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, (payload) => {
        setSettings({ logoUrl: (payload.new as any).logo_url || "" });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(productChannel);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Toaster position="top-right" richColors />

        {user && (
          <header className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md shadow-sm">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-200 overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Croissant size={24} />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Higino Lopes</h1>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Panificadora</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs font-medium text-slate-500 capitalize">{user.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                  <LogOut size={20} />
                </Button>
              </div>
            </div>
          </header>
        )}

        <main className="container mx-auto px-4 pb-4 md:px-6 md:pb-6 pt-28">
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={handleLogin} logoUrl={settings.logoUrl} /> : <Navigate to={`/${user.role}`} />} />
            <Route path="/attendant" element={user?.role === "attendant" ? <AttendantArea products={products} user={user} /> : <Navigate to="/login" />} />
            <Route path="/cashier" element={user?.role === "cashier" ? <CashierArea orders={orders} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={user?.role === "admin" ? <AdminArea products={products} logoUrl={settings.logoUrl} /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
