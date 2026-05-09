import React, { useState, useEffect } from "react";
import { Product, User, UserRole } from "@/types";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Package, BarChart3, Calendar, TrendingUp, DollarSign, Users, Settings, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

interface AdminAreaProps {
  products: Product[];
  logoUrl?: string;
}

const AdminArea: React.FC<AdminAreaProps> = ({ products, logoUrl }) => {
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [dailyReport, setDailyReport] = useState<{ sales: any[]; total: number } | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<{ byDay: any; total: number } | null>(null);
  const [selectedAttendant, setSelectedAttendant] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("attendant");
  const [newUserName, setNewUserName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState(logoUrl || "");

  useEffect(() => { setNewLogoUrl(logoUrl || ""); }, [logoUrl]);

  useEffect(() => {
    fetchUsers();
    fetchReports();
  }, []);

  useEffect(() => { fetchReports(); }, [selectedAttendant]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("app_users")
      .select("id, email, name, role")
      .neq("role", "admin");
    setUsers(data || []);
  };

  const fetchReports = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      let dailyQuery = supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("status", "finalized")
        .gte("finalized_at", `${today}T00:00:00Z`)
        .lte("finalized_at", `${today}T23:59:59Z`);
      if (selectedAttendant) dailyQuery = dailyQuery.eq("attendant_id", selectedAttendant);

      let monthlyQuery = supabase
        .from("orders")
        .select("total, finalized_at")
        .eq("status", "finalized")
        .gte("finalized_at", firstDay)
        .lte("finalized_at", lastDay);
      if (selectedAttendant) monthlyQuery = monthlyQuery.eq("attendant_id", selectedAttendant);

      const [{ data: daily }, { data: monthly }] = await Promise.all([dailyQuery, monthlyQuery]);

      const mappedDaily = (daily || []).map((o: any) => ({
        id: o.id, number: o.number, total: Number(o.total),
        finalizedAt: o.finalized_at, attendantName: o.attendant_name,
        items: (o.order_items || []).map((i: any) => ({ name: i.name, price: Number(i.price), quantity: i.quantity })),
      }));
      setDailyReport({ sales: mappedDaily, total: mappedDaily.reduce((a, s) => a + s.total, 0) });

      const byDay: Record<string, number> = {};
      let monthlyTotal = 0;
      for (const s of monthly || []) {
        const day = (s.finalized_at as string).split("T")[0];
        byDay[day] = (byDay[day] || 0) + Number(s.total);
        monthlyTotal += Number(s.total);
      }
      setMonthlyReport({ byDay, total: monthlyTotal });
    } catch (err) {
      console.error("Erro ao buscar relatórios:", err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;
    const { error } = await supabase.from("products").insert({ name: newProductName, price: parseFloat(newProductPrice) });
    if (!error) { toast.success("Produto cadastrado!"); setNewProductName(""); setNewProductPrice(""); }
    else toast.error("Erro ao cadastrar produto.");
  };

  const handleDeleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    toast.error("Produto removido.");
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserName) return;
    const { data: existing } = await supabase.from("app_users").select("id").eq("email", newUserEmail).single();
    if (existing) { toast.error("E-mail já está em uso."); return; }
    const { error } = await supabase.from("app_users").insert({ email: newUserEmail, password: newUserPassword, name: newUserName, role: newUserRole });
    if (!error) { toast.success("Usuário cadastrado!"); setNewUserEmail(""); setNewUserPassword(""); setNewUserName(""); fetchUsers(); }
    else toast.error("Erro ao cadastrar usuário.");
  };

  const handleDeleteUser = async (id: string) => {
    await supabase.from("app_users").delete().eq("id", id);
    toast.error("Usuário removido.");
    fetchUsers();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("settings").update({ logo_url: newLogoUrl }).eq("id", 1);
    if (!error) toast.success("Configurações salvas!");
    else toast.error("Erro ao salvar configurações.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("A imagem deve ter no máximo 1MB."); return; }
    const reader = new FileReader();
    reader.onload = (event) => { if (event.target?.result) setNewLogoUrl(event.target.result as string); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pb-12 px-2 md:px-6">
      <div className="space-y-6">
        <div className="px-2 md:px-0 flex flex-col items-center text-center">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">Painel Administrativo</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base mt-2 max-w-md">Gerenciamento de estoque e relatórios reais.</p>
        </div>

        <Tabs defaultValue="products" className="outline-none relative">
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg sm:max-w-2xl">
            <TabsList className="bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl p-1.5 rounded-full w-full grid grid-cols-4 gap-1.5">
              {[
                { value: "products", icon: <Package className="mr-1.5 h-4 w-4 md:h-5 md:w-5" />, label: "Produtos" },
                { value: "reports", icon: <BarChart3 className="mr-1.5 h-4 w-4 md:h-5 md:w-5" />, label: "Relatórios" },
                { value: "users", icon: <Users className="mr-1.5 h-4 w-4 md:h-5 md:w-5" />, label: "Equipe" },
                { value: "settings", icon: <Settings className="mr-1.5 h-4 w-4 md:h-5 md:w-5" />, label: "Personalizar" },
              ].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-full py-3.5 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-500 hover:text-slate-900 font-bold transition-all text-xs md:text-sm">
                  {tab.icon} {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── PRODUCTS ── */}
          <TabsContent value="products" className="w-full max-w-5xl mx-auto pt-6 pb-28 outline-none">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
              <div className="w-full lg:w-80 shrink-0">
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-6 md:p-8 pb-4 rounded-none">
                    <CardTitle className="text-lg font-bold text-slate-900">Novo Item</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Adicione produtos ao sistema.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleAddProduct}>
                    <CardContent className="p-6 md:p-8 pt-2 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome</Label>
                        <Input id="name" placeholder="Ex: Pão Francês" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} required className="bg-slate-50 border-slate-100 h-11 rounded-xl px-4 focus-visible:ring-orange-500 font-semibold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</Label>
                        <Input id="price" type="number" step="0.01" placeholder="0,00" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} required className="bg-slate-50 border-slate-100 h-11 rounded-xl px-4 focus-visible:ring-orange-500 font-bold" />
                      </div>
                    </CardContent>
                    <div className="p-6 md:p-8 pt-0">
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-11 rounded-xl shadow-lg shadow-orange-100 active:scale-[0.98] transition-all">
                        <Plus className="mr-2 h-4 w-4" /> Cadastrar
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>

              <div className="w-full flex-1 min-w-0">
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-900 p-6 md:p-8 flex flex-row items-center justify-between rounded-none">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Estoque</CardTitle>
                      <CardDescription className="text-slate-400 text-xs mt-2">{products.length} itens</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white"><Package size={20} /></div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 border-none h-12">
                          <TableHead className="pl-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Produto</TableHead>
                          <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Preço</TableHead>
                          <TableHead className="pr-6 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((p) => (
                          <TableRow key={p.id} className="border-b border-slate-50 hover:bg-slate-50/30 h-14">
                            <TableCell className="pl-6 font-bold text-slate-900 text-sm truncate max-w-[120px] md:max-w-none">{p.name}</TableCell>
                            <TableCell><span className="bg-orange-50 text-orange-600 font-black px-3 py-1 rounded-lg text-xs">{p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg h-8 w-8"><Trash2 size={16} /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {products.length === 0 && (
                          <TableRow><TableCell colSpan={3} className="text-center py-20 text-slate-300 text-xs italic">Sem itens no estoque.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── REPORTS ── */}
          <TabsContent value="reports" className="w-full max-w-5xl mx-auto pt-6 pb-28 space-y-6 md:space-y-10 outline-none">
            <div className="flex justify-end pr-2 md:pr-0">
              <div className="w-full max-w-xs">
                <Label htmlFor="attendantFilter" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Filtrar por Atendente</Label>
                <select id="attendantFilter" value={selectedAttendant} onChange={(e) => setSelectedAttendant(e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm h-11 rounded-xl px-4 font-semibold text-sm outline-none">
                  <option value="">Todos</option>
                  {users.filter((u) => u.role === "attendant").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatsCard title="Vendas Hoje" value={dailyReport?.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"} footer={`${dailyReport?.sales.length || 0} pedidos`} icon={<TrendingUp className="h-5 w-5" />} color="orange" />
              <StatsCard title="Faturamento Mês" value={monthlyReport?.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"} footer="Total acumulado" icon={<Calendar className="h-5 w-5" />} color="blue" />
              <StatsCard title="Ticket Médio" value={dailyReport && dailyReport.sales.length > 0 ? (dailyReport.total / dailyReport.sales.length).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"} footer="Média de hoje" icon={<DollarSign className="h-5 w-5" />} color="green" />
              <StatsCard title="Status" value="Ativo" footer="Sincronizado" icon={<Package className="h-5 w-5" />} color="purple" isStatus />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <ReportTable title="Vendas do Dia" subtitle="Últimas 24 horas" icon={<TrendingUp size={18} />} color="orange">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 h-10 border-none">
                      <TableHead className="pl-6 text-[10px] uppercase font-bold text-slate-400">ID</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-slate-400">Atendente</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-slate-400">Hora</TableHead>
                      <TableHead className="pr-6 text-right text-[10px] uppercase font-bold text-slate-400">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyReport?.sales.map((sale) => (
                      <TableRow key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50 h-12">
                        <TableCell className="pl-6 font-bold text-slate-300 text-xs">#{sale.number}</TableCell>
                        <TableCell className="text-slate-500 text-xs truncate max-w-[100px]">{sale.attendantName || "-"}</TableCell>
                        <TableCell className="text-slate-400 text-[11px]">{new Date(sale.finalizedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell className="pr-6 text-right font-bold text-orange-600 text-xs">{sale.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      </TableRow>
                    ))}
                    {(!dailyReport || dailyReport.sales.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400 text-xs italic">Sem registros hoje.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ReportTable>

              <ReportTable title="Histórico Mensal" subtitle="Faturamento por dia" icon={<Calendar size={18} />} color="blue">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 h-10 border-none">
                      <TableHead className="pl-6 text-[10px] uppercase font-bold text-slate-400">Data</TableHead>
                      <TableHead className="pr-6 text-right text-[10px] uppercase font-bold text-slate-400">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReport && Object.entries(monthlyReport.byDay).sort().reverse().map(([day, total]: [string, any]) => (
                      <TableRow key={day} className="border-b border-slate-50 hover:bg-slate-50/50 h-12">
                        <TableCell className="pl-6 font-semibold text-slate-900 text-xs">{new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</TableCell>
                        <TableCell className="pr-6 text-right font-bold text-blue-600 text-xs">{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      </TableRow>
                    ))}
                    {(!monthlyReport || Object.keys(monthlyReport.byDay).length === 0) && (
                      <TableRow><TableCell colSpan={2} className="text-center py-20 text-slate-400 text-xs italic">Sem dados disponíveis.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ReportTable>
            </div>
          </TabsContent>

          {/* ── USERS ── */}
          <TabsContent value="users" className="w-full max-w-5xl mx-auto pt-6 pb-28 outline-none">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
              <div className="w-full lg:w-80 shrink-0">
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-6 md:p-8 pb-4 rounded-none">
                    <CardTitle className="text-lg font-bold text-slate-900">Novo Colaborador</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Cadastre atendentes e caixas.</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleAddUser}>
                    <CardContent className="p-6 md:p-8 pt-2 space-y-5">
                      {[
                        { id: "userName", label: "Nome", placeholder: "Ex: João Silva", value: newUserName, onChange: (e: any) => setNewUserName(e.target.value) },
                        { id: "userEmail", label: "E-mail", placeholder: "joao@higinolopes.com", value: newUserEmail, onChange: (e: any) => setNewUserEmail(e.target.value), type: "email" },
                        { id: "userPassword", label: "Senha", placeholder: "Senha forte", value: newUserPassword, onChange: (e: any) => setNewUserPassword(e.target.value) },
                      ].map((f) => (
                        <div key={f.id} className="space-y-2">
                          <Label htmlFor={f.id} className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</Label>
                          <Input id={f.id} type={f.type || "text"} placeholder={f.placeholder} value={f.value} onChange={f.onChange} required className="bg-slate-50 border-slate-100 h-11 rounded-xl px-4 focus-visible:ring-orange-500 font-semibold" />
                        </div>
                      ))}
                      <div className="space-y-2">
                        <Label htmlFor="userRole" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</Label>
                        <select id="userRole" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)} className="w-full bg-slate-50 border-slate-100 h-11 rounded-xl px-4 font-semibold text-sm outline-none">
                          <option value="attendant">Atendente</option>
                          <option value="cashier">Caixa</option>
                        </select>
                      </div>
                    </CardContent>
                    <div className="p-6 md:p-8 pt-0">
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-11 rounded-xl shadow-lg shadow-orange-100 active:scale-[0.98] transition-all">
                        <Plus className="mr-2 h-4 w-4" /> Cadastrar Colaborador
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>

              <div className="w-full flex-1 min-w-0">
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-900 p-6 md:p-8 flex flex-row items-center justify-between rounded-none">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Equipe</CardTitle>
                      <CardDescription className="text-slate-400 text-xs mt-2">{users.length} usuários</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white"><Users size={20} /></div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 border-none h-12">
                          <TableHead className="pl-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">Nome</TableHead>
                          <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">E-mail</TableHead>
                          <TableHead className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Cargo</TableHead>
                          <TableHead className="pr-6 text-right font-black text-slate-400 text-[10px] uppercase tracking-widest">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id} className="border-b border-slate-50 hover:bg-slate-50/30 h-14">
                            <TableCell className="pl-6 font-bold text-slate-900 text-sm truncate max-w-[120px] md:max-w-none">{u.name}</TableCell>
                            <TableCell className="text-slate-500 text-xs font-medium">{u.email}</TableCell>
                            <TableCell>
                              <span className={`font-black px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider ${u.role === "attendant" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                                {u.role === "attendant" ? "Atendente" : "Caixa"}
                              </span>
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg h-8 w-8"><Trash2 size={16} /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-300 text-xs italic">Sem usuários na equipe.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── SETTINGS ── */}
          <TabsContent value="settings" className="w-full max-w-5xl mx-auto pt-6 pb-28 outline-none">
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
              <div className="w-full lg:w-96 shrink-0">
                <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-slate-900 p-6 md:p-8 flex flex-row items-center justify-between rounded-none">
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Personalizar</CardTitle>
                      <CardDescription className="text-slate-400 text-xs mt-2">Alterar configurações do site.</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white"><Settings size={20} /></div>
                  </CardHeader>
                  <form onSubmit={handleSaveSettings}>
                    <CardContent className="p-6 md:p-8 space-y-5">
                      <div className="space-y-4">
                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Logo do Sistema (Upload)</Label>
                        <div className="relative border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group bg-slate-50/50">
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Selecione uma logo" />
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-orange-500 group-hover:scale-110 transition-all mb-3">
                            <UploadCloud size={20} />
                          </div>
                          <p className="text-sm font-semibold text-slate-700">Clique para enviar a logo</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG, max 1MB</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">Deixe vazio para usar o padrão.</p>
                          {newLogoUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setNewLogoUrl("")} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 text-xs font-semibold">Remover Imagem</Button>
                          )}
                        </div>
                        {newLogoUrl && (
                          <div className="mt-4 flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                            <img src={newLogoUrl} alt="Preview Logo" className="max-h-24 max-w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <div className="p-6 md:p-8 pt-0">
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-11 rounded-xl shadow-lg shadow-orange-100 active:scale-[0.98] transition-all">
                        Salvar Configurações
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const StatsCard = ({ title, value, footer, icon, color, isStatus }: any) => {
  const colorMap: any = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <Card className="border-none shadow-lg shadow-slate-200/40 rounded-3xl p-5 md:p-6 bg-white flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
        <div className={`p-2 rounded-xl scale-90 ${colorMap[color]}`}>{icon}</div>
      </div>
      <div>
        <span className="text-lg md:text-2xl font-black text-slate-900 block leading-tight">{value}</span>
        <div className="flex items-center gap-1.5 mt-1.5">
          {isStatus && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
          <span className={`text-[11px] font-bold ${isStatus ? "text-green-500" : "text-slate-400"}`}>{footer}</span>
        </div>
      </div>
    </Card>
  );
};

const ReportTable = ({ title, subtitle, icon, color, children }: any) => {
  const colorMap: any = {
    orange: "bg-orange-50 text-orange-600 shadow-orange-100",
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
  };
  return (
    <Card className="border-none p-0 gap-0 shadow-xl shadow-slate-200/60 rounded-3xl overflow-hidden bg-white">
      <CardHeader className="p-6 border-b border-slate-50 rounded-none">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shadow-sm ${colorMap[color]}`}>{icon}</div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
            <CardDescription className="text-xs">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 md:h-[400px]">{children}</ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AdminArea;
