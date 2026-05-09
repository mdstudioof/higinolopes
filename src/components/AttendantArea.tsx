import React, { useState, useMemo } from "react";
import { Product, OrderItem, Order, User as UserModel } from "@/types";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, ShoppingCart, Send, Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface AttendantAreaProps {
  products: Product[];
  user: UserModel;
}

const AttendantArea: React.FC<AttendantAreaProps> = ({ products, user }) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [products, searchQuery]
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) return prev.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing && existing.quantity > 1) return prev.map((item) => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item);
      return prev.filter((item) => item.productId !== productId);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleSendOrder = async () => {
    if (cart.length === 0) { toast.error("O carrinho está vazio."); return; }
    setSending(true);

    // Cria o pedido
    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({ total, status: "pending", attendant_id: user.id, attendant_name: user.name })
      .select()
      .single();

    if (error || !newOrder) {
      toast.error("Erro ao criar pedido."); setSending(false); return;
    }

    // Insere os itens
    await supabase.from("order_items").insert(
      cart.map((item) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    );

    // Busca o pedido completo para imprimir (com número gerado)
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", newOrder.id)
      .single();

    if (fullOrder) {
      const mapped: Order = {
        id: fullOrder.id,
        number: fullOrder.number,
        items: (fullOrder.order_items || []).map((i: any) => ({
          productId: i.product_id, name: i.name, price: Number(i.price), quantity: i.quantity,
        })),
        total: Number(fullOrder.total),
        status: fullOrder.status,
        createdAt: fullOrder.created_at,
        attendantId: fullOrder.attendant_id,
        attendantName: fullOrder.attendant_name,
      };
      toast.success(`Pedido #${mapped.number} enviado com sucesso!`);
    }

    setCart([]);
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Products Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-10 h-12 bg-white border-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.button
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addToCart(product)}
                className="group flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-orange-500"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <span className="text-xl font-bold">{product.name.charAt(0)}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                <p className="mt-1 text-xs font-bold text-orange-600">
                  {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Area */}
      <div className="lg:col-span-1 border-t lg:border-t-0 pt-6 lg:pt-0 mt-6 lg:mt-0">
        <div className="lg:sticky lg:top-[88px] lg:h-[calc(100vh-112px)] flex flex-col">
          <Card className="flex flex-col flex-1 border-none p-0 gap-0 shadow-2xl shadow-slate-200 rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-4 px-6 shrink-0 m-0 rounded-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <ShoppingCart size={20} />
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight">Carrinho</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={clearCart} className="text-slate-400 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl">
                  <Trash2 size={18} />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 min-h-0 pt-4">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                        <ShoppingCart size={32} />
                      </div>
                      <p className="text-sm font-medium text-slate-500">Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1 pr-2">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">{item.name}</h4>
                          <p className="text-xs text-slate-500">
                            {item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors" onClick={() => removeFromCart(item.productId)}>
                            <Minus size={14} />
                          </Button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors" onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price })}>
                            <Plus size={14} />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="p-6 bg-slate-50 border-t shrink-0 rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 font-medium">Total</span>
                  <span className="text-2xl font-black text-slate-900">
                    {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <motion.div
                  animate={cart.length > 0 ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Button
                    className={`w-full h-12 font-bold text-lg shadow-lg transition-all duration-300 rounded-xl ${
                      cart.length > 0
                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    onClick={handleSendOrder}
                    disabled={cart.length === 0 || sending}
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {sending ? "Enviando..." : "Enviar para o Caixa"}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendantArea;
