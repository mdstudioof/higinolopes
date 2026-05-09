import React from "react";
import { Order } from "@/types";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface CashierAreaProps {
  orders: Order[];
}

const CashierArea: React.FC<CashierAreaProps> = ({ orders }) => {
  const handleFinalize = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "finalized", finalized_at: new Date().toISOString() })
      .eq("id", orderId);

    if (!error) toast.success("Pedido finalizado com sucesso!");
    else toast.error("Erro ao finalizar pedido.");
  };

  const handleCancel = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (!error) toast.error("Pedido cancelado.");
    else toast.error("Erro ao cancelar pedido.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Pedidos Pendentes</h2>
        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 px-3 py-1 text-sm font-bold">
          {orders.length} {orders.length === 1 ? "Pedido" : "Pedidos"}
        </Badge>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl shadow-sm">
          <div className="mb-4 rounded-full bg-slate-100 p-6 text-slate-300">
            <Receipt size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Nenhum pedido no momento</h3>
          <p className="mt-1 text-slate-500">Aguardando novos pedidos da atendente...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200 rounded-[2rem] overflow-hidden bg-white">
                  <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between py-4 px-6 rounded-none m-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                        #{order.number}
                      </div>
                      <CardTitle className="text-base font-bold">Pedido</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Clock size={12} />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                      {order.attendantName ? (
                        <div className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-md">
                          Atend: {order.attendantName}
                        </div>
                      ) : <div />}
                    </div>

                    <ScrollArea className="h-32 pr-4">
                      <ul className="space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              <span className="font-bold text-slate-900">{item.quantity}x</span> {item.name}
                            </span>
                            <span className="font-medium text-slate-900">
                              {(item.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Total</span>
                      <span className="text-xl font-black text-orange-600">
                        {order.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="bg-slate-50 p-4 gap-3 rounded-none m-0 border-t-0">
                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                      onClick={() => handleCancel(order.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-100"
                      onClick={() => handleFinalize(order.id)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CashierArea;
