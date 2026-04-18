"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

interface Address {
  id: string;
  recipientName: string;
  phone: string;
  email?: string;
  country: string;
  countryName: { zh: string; en: string; ja: string };
  addressLine1: string;
  addressLine2?: string;
  state?: string;
  city: string;
  postalCode?: string;
  fullAddressText: { zh: string; en: string; ja: string };
  label: "home" | "work" | "other";
  isDefault: boolean;
}

const COUNTRIES = [
  { value: "CN", label: "中国" },
  { value: "JP", label: "日本" },
  { value: "US", label: "美国" },
  { value: "UK", label: "英国" },
  { value: "AU", label: "澳大利亚" },
  { value: "DE", label: "德国" },
  { value: "FR", label: "法国" },
  { value: "KR", label: "韩国" },
  { value: "TW", label: "台湾" },
  { value: "HK", label: "香港" },
  { value: "SG", label: "新加坡" },
  { value: "CA", label: "加拿大" },
  { value: "OTHER", label: "其他" },
];

export default function AddressesPage() {
  const t = useTranslations("address");
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated } = useAuthStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    recipientName: "",
    phone: "",
    email: "",
    country: "CN",
    addressLine1: "",
    addressLine2: "",
    state: "",
    city: "",
    postalCode: "",
    label: "home" as "home" | "work" | "other",
    isDefault: false,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      const response = await api.getAddresses() as { success: boolean; data?: Address[] };
      if (response.success && response.data) {
        setAddresses(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        recipientName: address.recipientName,
        phone: address.phone,
        email: address.email || "",
        country: address.country,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        state: address.state || "",
        city: address.city,
        postalCode: address.postalCode || "",
        label: address.label as "home" | "work" | "other",
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      setFormData({
        recipientName: "",
        phone: "",
        email: "",
        country: "CN",
        addressLine1: "",
        addressLine2: "",
        state: "",
        city: "",
        postalCode: "",
        label: "home",
        isDefault: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingAddress) {
        const response = await api.updateAddress(editingAddress.id, formData);
        if (response.success) {
          await fetchAddresses();
          setIsDialogOpen(false);
        }
      } else {
        const response = await api.createAddress(formData);
        if (response.success) {
          await fetchAddresses();
          setIsDialogOpen(false);
        }
      }
    } catch (err) {
      console.error("Failed to save address:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      const response = await api.deleteAddress(id);
      if (response.success) {
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await api.setDefaultAddress(id);
      if (response.success) {
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Failed to set default address:", err);
    }
  };

  const getLabelText = (label: string) => {
    switch (label) {
      case "home":
        return t("labelHome");
      case "work":
        return t("labelWork");
      default:
        return t("labelOther");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">请先登录</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => handleOpenDialog()}>+ {t("add")}</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {address.recipientName}
                    {address.isDefault && (
                      <Badge variant="secondary">{t("default")}</Badge>
                    )}
                  </CardTitle>
                  <Badge variant="outline">{getLabelText(address.label)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{address.phone}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {address.countryName.zh} {address.fullAddressText.zh}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(address)}
                  >
                    {t("edit")}
                  </Button>
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      {t("setDefault")}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(address.id)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? t("edit") : t("add")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("recipientName")}</Label>
                <Input
                  value={formData.recipientName}
                  onChange={(e) =>
                    setFormData({ ...formData, recipientName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("country")}</Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value || "CN" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("address")}</Label>
              <Input
                value={formData.addressLine1}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine1: e.target.value })
                }
                placeholder="街道、门牌号"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("address")} 2</Label>
              <Input
                value={formData.addressLine2}
                onChange={(e) =>
                  setFormData({ ...formData, addressLine2: e.target.value })
                }
                placeholder=" Apartment, suite, unit, building, floor, etc. (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("state")}</Label>
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("city")}</Label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("postalCode")}</Label>
                <Input
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("label")}</Label>
                <Select
                  value={formData.label}
                  onValueChange={(value) =>
                    setFormData({ ...formData, label: (value || "home") as "home" | "work" | "other" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{t("labelHome")}</SelectItem>
                    <SelectItem value="work">{t("labelWork")}</SelectItem>
                    <SelectItem value="other">{t("labelOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "..." : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
