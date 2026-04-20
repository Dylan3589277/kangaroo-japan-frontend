"use client";

import { useState } from "react";

interface ContactButton {
  platform: string;
  name: string;
  icon: string;
  color: string;
  link: string;
  description: string;
}

const CONTACTS: ContactButton[] = [
  {
    platform: "wechat",
    name: "微信",
    icon: "💬",
    color: "bg-green-500 hover:bg-green-600",
    link: "weixin://",
    description: "微信客服",
  },
  {
    platform: "whatsapp",
    name: "WhatsApp",
    icon: "📱",
    color: "bg-green-400 hover:bg-green-500",
    link: "whatsapp://send?phone=",
    description: "WhatsApp 国际客服",
  },
  {
    platform: "email",
    name: "邮件",
    icon: "📧",
    color: "bg-blue-500 hover:bg-blue-600",
    link: "mailto:",
    description: "Email 客服",
  },
];

interface ContactButtonsProps {
  className?: string;
  variant?: "button" | "icon" | "full";
  email?: string;
  wechatId?: string;
  whatsappNumber?: string;
}

export function ContactButtons({
  className = "",
  variant = "button",
  email = "support@jp-buy.com",
  wechatId = "JPBuy666",
  whatsappNumber = "",
}: ContactButtonsProps) {
  const [showWechatQR, setShowWechatQR] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`, "_blank");
    }
  };

  const handleEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  // Icon only variant
  if (variant === "icon") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {CONTACTS.map((contact) => (
          <button
            key={contact.platform}
            onClick={() => {
              if (contact.platform === "wechat") setShowWechatQR(true);
              else if (contact.platform === "whatsapp") handleWhatsApp();
              else if (contact.platform === "email") handleEmail();
            }}
            className={`w-10 h-10 rounded-full ${contact.color} text-white flex items-center justify-center text-xl transition-colors`}
            title={contact.name}
          >
            {contact.icon}
          </button>
        ))}
      </div>
    );
  }

  // Full variant with descriptions
  if (variant === "full") {
    return (
      <div className={`space-y-3 ${className}`}>
        {CONTACTS.map((contact) => (
          <button
            key={contact.platform}
            onClick={() => {
              if (contact.platform === "wechat") setShowWechatQR(true);
              else if (contact.platform === "whatsapp") handleWhatsApp();
              else if (contact.platform === "email") handleEmail();
            }}
            className={`w-full p-4 rounded-xl ${contact.color} text-white flex items-center gap-4 transition-colors`}
          >
            <span className="text-2xl">{contact.icon}</span>
            <div className="text-left">
              <div className="font-semibold">{contact.name}</div>
              <div className="text-sm opacity-80">{contact.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Default button variant
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {CONTACTS.map((contact) => (
        <button
          key={contact.platform}
          onClick={() => {
            if (contact.platform === "wechat") setShowWechatQR(true);
            else if (contact.platform === "whatsapp") handleWhatsApp();
            else if (contact.platform === "email") handleEmail();
          }}
          className={`px-4 py-2 rounded-lg ${contact.color} text-white flex items-center gap-2 transition-colors text-sm font-medium`}
        >
          <span>{contact.icon}</span>
          <span>{contact.name}</span>
        </button>
      ))}
    </div>
  );
}

// WeChat QR Code Modal Component
export function WechatQRModal({
  isOpen,
  onClose,
  qrCodeUrl = "/wechat-qr.png",
  wechatId = "JPBuy666",
}: {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl?: string;
  wechatId?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
        
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-xl font-bold mb-2">添加客服微信</h3>
          <p className="text-gray-600 mb-4">微信ID: <span className="font-mono font-bold">{wechatId}</span></p>
          
          {/* Placeholder for QR code - in production, replace with actual QR */}
          <div className="bg-gray-100 rounded-xl w-48 h-48 mx-auto mb-4 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-2">📱</div>
              <div className="text-sm">客服二维码</div>
            </div>
          </div>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(wechatId);
              alert("微信号已复制！");
            }}
            className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            复制微信号
          </button>
        </div>
      </div>
    </div>
  );
}
