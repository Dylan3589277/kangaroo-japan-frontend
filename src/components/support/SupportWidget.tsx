"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Lang = "zh" | "en" | "ja";
type Tab = "chat" | "ticket";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Copy = {
  buttonLabel: string;
  title: string;
  subtitle: string;
  chatTab: string;
  ticketTab: string;
  inputPlaceholder: string;
  send: string;
  ticketName: string;
  ticketEmail: string;
  ticketSubject: string;
  ticketCategory: string;
  ticketDescription: string;
  ticketSubmit: string;
  ticketSuccess: string;
  requiredError: string;
  requestError: string;
  greeting: string;
  categories: { value: string; label: string }[];
};

const COPY: Record<Lang, Copy> = {
  zh: {
    buttonLabel: "打开客服",
    title: "袋鼠君客服",
    subtitle: "先由自动客服回复，复杂问题可提交工单。",
    chatTab: "在线咨询",
    ticketTab: "提交工单",
    inputPlaceholder: "请输入你的问题…",
    send: "发送",
    ticketName: "姓名",
    ticketEmail: "邮箱",
    ticketSubject: "主题",
    ticketCategory: "问题类型",
    ticketDescription: "问题描述",
    ticketSubmit: "提交工单",
    ticketSuccess: "工单已提交，编号：",
    requiredError: "请把必填信息填写完整。",
    requestError: "暂时提交失败，请稍后再试。",
    greeting: "你好，我是袋鼠君客服。可以咨询商品、配送、付款等问题。",
    categories: [
      { value: "general", label: "商品咨询" },
      { value: "shipping", label: "配送问题" },
      { value: "order", label: "订单问题" },
      { value: "refund", label: "退款问题" },
      { value: "complaint", label: "投诉建议" },
    ],
  },
  en: {
    buttonLabel: "Open support",
    title: "Kangaroo Support",
    subtitle: "Auto support replies first. Submit a ticket for complex issues.",
    chatTab: "Chat",
    ticketTab: "Ticket",
    inputPlaceholder: "Type your question…",
    send: "Send",
    ticketName: "Name",
    ticketEmail: "Email",
    ticketSubject: "Subject",
    ticketCategory: "Category",
    ticketDescription: "Description",
    ticketSubmit: "Submit ticket",
    ticketSuccess: "Ticket submitted. Number: ",
    requiredError: "Please fill in all required fields.",
    requestError: "Request failed. Please try again later.",
    greeting: "Hi, I am Kangaroo Support. Ask me about products, shipping, payment, and more.",
    categories: [
      { value: "general", label: "Product" },
      { value: "shipping", label: "Shipping" },
      { value: "order", label: "Order" },
      { value: "refund", label: "Refund" },
      { value: "complaint", label: "Complaint" },
    ],
  },
  ja: {
    buttonLabel: "サポートを開く",
    title: "カンガルーサポート",
    subtitle: "まず自動返信します。複雑な内容はチケットでお問い合わせください。",
    chatTab: "チャット",
    ticketTab: "チケット",
    inputPlaceholder: "質問を入力してください…",
    send: "送信",
    ticketName: "お名前",
    ticketEmail: "メール",
    ticketSubject: "件名",
    ticketCategory: "カテゴリ",
    ticketDescription: "お問い合わせ内容",
    ticketSubmit: "送信する",
    ticketSuccess: "チケットを受け付けました。番号：",
    requiredError: "必須項目を入力してください。",
    requestError: "送信に失敗しました。時間をおいて再度お試しください。",
    greeting: "こんにちは。カンガルーサポートです。商品、配送、お支払いなどをご相談ください。",
    categories: [
      { value: "general", label: "商品相談" },
      { value: "shipping", label: "配送" },
      { value: "order", label: "注文" },
      { value: "refund", label: "返金" },
      { value: "complaint", label: "苦情・要望" },
    ],
  },
};

function normalizeLang(lang: string): Lang {
  return lang === "en" || lang === "ja" ? lang : "zh";
}

function getTicketNumber(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const nested = record.ticket && typeof record.ticket === "object" ? (record.ticket as Record<string, unknown>) : null;
  const responseData = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
  const dataTicket = responseData?.ticket && typeof responseData.ticket === "object" ? (responseData.ticket as Record<string, unknown>) : null;

  const value =
    record.ticketNumber ??
    record.ticket_number ??
    record.number ??
    nested?.ticketNumber ??
    nested?.ticket_number ??
    nested?.number ??
    responseData?.ticketNumber ??
    responseData?.ticket_number ??
    responseData?.number ??
    dataTicket?.ticketNumber ??
    dataTicket?.ticket_number ??
    dataTicket?.number;

  return typeof value === "string" ? value : null;
}

export function SupportWidget({ lang }: { lang: string }) {
  const locale = normalizeLang(lang);
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: copy.greeting }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    description: "",
  });

  const canSendChat = useMemo(() => chatInput.trim().length > 0 && !chatLoading, [chatInput, chatLoading]);

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || chatLoading) return;

    setError(null);
    setChatInput("");
    setMessages((current) => [...current, { role: "user", content }]);
    setChatLoading(true);

    const response = await api.sendSupportChat({ message: content, conversationId, language: locale });
    setChatLoading(false);

    if (!response.success || !response.data) {
      setError(copy.requestError);
      return;
    }

    const data = response.data;
    setConversationId(data.conversationId ?? conversationId);
    setMessages((current) => [...current, { role: "assistant", content: data.reply || copy.requestError }]);
  }

  async function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTicketNumber(null);

    const name = ticketForm.name.trim();
    const email = ticketForm.email.trim();
    const subject = ticketForm.subject.trim();
    const description = ticketForm.description.trim();

    if (!name || !email || !subject || !description) {
      setError(copy.requiredError);
      return;
    }

    setTicketLoading(true);
    const response = await api.createSupportTicket({
      name,
      email,
      subject,
      category: ticketForm.category,
      description,
      language: locale,
    });
    setTicketLoading(false);

    if (!response.success) {
      setError(copy.requestError);
      return;
    }

    setTicketNumber(getTicketNumber(response.data) ?? "—");
    setTicketForm({ name: "", email: "", subject: "", category: "general", description: "" });
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {open ? (
        <section className="mb-3 flex max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[380px]">
          <div className="flex items-start justify-between bg-slate-950 px-4 py-3 text-white">
            <div>
              <h2 className="text-base font-semibold">{copy.title}</h2>
              <p className="mt-1 text-xs text-slate-300">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Close support"
              className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-200 text-sm font-medium">
            <button
              type="button"
              className={`px-4 py-2 ${tab === "chat" ? "bg-slate-100 text-slate-950" : "text-slate-500"}`}
              onClick={() => setTab("chat")}
            >
              {copy.chatTab}
            </button>
            <button
              type="button"
              className={`px-4 py-2 ${tab === "ticket" ? "bg-slate-100 text-slate-950" : "text-slate-500"}`}
              onClick={() => setTab("ticket")}
            >
              {copy.ticketTab}
            </button>
          </div>

          {error ? <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {ticketNumber ? (
            <div className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {copy.ticketSuccess}
              <span className="font-semibold">{ticketNumber}</span>
            </div>
          ) : null}

          {tab === "chat" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="max-h-[360px] min-h-[260px] space-y-3 overflow-y-auto px-4 py-3">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        message.role === "user" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {chatLoading ? <div className="text-sm text-slate-500">...</div> : null}
              </div>
              <form className="flex gap-2 border-t border-slate-200 p-3" onSubmit={handleChatSubmit}>
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder={copy.inputPlaceholder}
                  aria-label={copy.inputPlaceholder}
                />
                <Button type="submit" size="sm" disabled={!canSendChat}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">{copy.send}</span>
                </Button>
              </form>
            </div>
          ) : (
            <form className="space-y-3 overflow-y-auto p-4" onSubmit={handleTicketSubmit}>
              <Input
                value={ticketForm.name}
                onChange={(event) => setTicketForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={copy.ticketName}
                aria-label={copy.ticketName}
                required
              />
              <Input
                type="email"
                value={ticketForm.email}
                onChange={(event) => setTicketForm((current) => ({ ...current, email: event.target.value }))}
                placeholder={copy.ticketEmail}
                aria-label={copy.ticketEmail}
                required
              />
              <Input
                value={ticketForm.subject}
                onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder={copy.ticketSubject}
                aria-label={copy.ticketSubject}
                required
              />
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                value={ticketForm.category}
                onChange={(event) => setTicketForm((current) => ({ ...current, category: event.target.value }))}
                aria-label={copy.ticketCategory}
              >
                {copy.categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={ticketForm.description}
                onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
                placeholder={copy.ticketDescription}
                aria-label={copy.ticketDescription}
                required
              />
              <Button type="submit" className="w-full" disabled={ticketLoading}>
                {ticketLoading ? "..." : copy.ticketSubmit}
              </Button>
            </form>
          )}
        </section>
      ) : null}

      <button
        type="button"
        aria-label={copy.buttonLabel}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
