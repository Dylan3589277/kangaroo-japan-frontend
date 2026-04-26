"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PhotoOrderItem {
  id: string;
  title: string;
  quantity: number;
  image?: string;
}

interface PhotoOrder {
  id: string;
  orderNo: string;
  items: PhotoOrderItem[];
  status: string;
  photoCount: number;
  requiredPhotoCount: number;
  createdAt: string;
}

interface PhotoListData {
  list: PhotoOrder[];
  total: number;
  totalPages: number;
}

export default function PhotosPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<PhotoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Upload Dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PhotoOrder | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<PhotoListData>("/stores/photos", {
        method: "POST",
        body: { page, limit: 10 },
      });
      if (res.success && res.data) {
        const data = res.data;
        setOrders(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch photo orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders]);

  const openUploadDialog = (order: PhotoOrder) => {
    setSelectedOrder(order);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Only accept image files
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      toast.warning("已过滤非图片文件");
    }

    setSelectedFiles((prev) => [...prev, ...imageFiles]);

    // Generate preview URLs
    const newPreviews = imageFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedOrder || selectedFiles.length === 0) {
      toast.error("请选择要上传的照片");
      return;
    }
    setUploading(true);
    try {
      // Upload files using FormData
      const formData = new FormData();
      formData.append("orderId", selectedOrder.id);
      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await api.request("/stores/addPhotos", {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type for multipart
      });

      if (res.success) {
        toast.success(`成功上传 ${selectedFiles.length} 张照片`);
        setUploadDialogOpen(false);
        setSelectedOrder(null);
        setSelectedFiles([]);
        setPreviewUrls([]);
        fetchOrders();
      } else {
        toast.error(res.error?.message || "上传失败");
      }
    } catch (error) {
      console.error("Failed to upload photos:", error);
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full mb-3 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <Link href={`/${lang}/login`}>
          <Button className="bg-rose-600 hover:bg-rose-700">去登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/${lang}/warehouse`}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← 返回仓库首页
        </Link>
        <h1 className="text-2xl font-bold">拍照订单</h1>
        <p className="text-sm text-muted-foreground">
          为订单商品拍照存档，管理照片上传
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📸</div>
          <h2 className="text-lg font-semibold mb-1">暂无拍照订单</h2>
          <p className="text-sm text-muted-foreground mb-6">
            还没有需要拍照的订单
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">
                        #{order.orderNo}
                      </span>
                      <Badge
                        className={
                          order.photoCount >= order.requiredPhotoCount
                            ? "bg-green-500 text-white text-xs"
                            : "bg-yellow-500 text-white text-xs"
                        }
                      >
                        {order.photoCount >= order.requiredPhotoCount
                          ? "已拍完"
                          : `待拍照 ${order.photoCount}/${order.requiredPhotoCount}`}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="border rounded-lg divide-y mb-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              "📦"
                            )}
                          </div>
                          <span className="text-sm line-clamp-1">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-sm font-mono">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Photo Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>📷</span>
                      <span>
                        已拍 {order.photoCount} / 需拍 {order.requiredPhotoCount} 张
                      </span>
                      {order.photoCount > 0 && (
                        <span className="text-green-600">✅</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUploadDialog(order)}
                      className="flex items-center gap-1"
                    >
                      <span>📸</span>
                      <span>上传照片</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>上传照片</DialogTitle>
            <DialogDescription>
              订单 #{selectedOrder?.orderNo} — 已拍 {selectedOrder?.photoCount ?? 0} / 需拍{" "}
              {selectedOrder?.requiredPhotoCount ?? 0} 张
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFiles.length === 0 ? (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm font-medium mb-1">点击选择照片</p>
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG 等常见图片格式，可多选
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preview Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}

                  {/* Add More Button */}
                  <div
                    className="h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="text-2xl text-muted-foreground">+</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  已选 {selectedFiles.length} 张照片
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                // Cleanup previews
                previewUrls.forEach((url) => URL.revokeObjectURL(url));
                setUploadDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {uploading ? "上传中..." : "上传照片"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
