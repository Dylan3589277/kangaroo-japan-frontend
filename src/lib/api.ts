function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (
    !configured ||
    configured.includes("kangaroo-japan-backend-production.up.railway.app")
  ) {
    return "/api/backend";
  }
  return configured;
}

const API_BASE_URL = getApiBaseUrl();

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
  /**
   * 401 且刷新 token 失败时，不要把用户强制跳到登录页，只返回 UNAUTHORIZED 让调用方自己降级。
   * 用于「登录了更好、没登录也得能看」的接口（如商品详情页的报价）——默认行为仍是跳登录。
   * 注意：token 刷新照常尝试，所以已登录但 token 过期的用户不受影响，仍会自动续期并重试。
   */
  skipAuthRedirect?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Mercari 委托下单 + NewAge 支付返回。后端透传旧系统结果，
// 两种支付形态都兼容：payUrl（跳 NewAge 收银台）或 qrcodeUrl（展示二维码）。
// amount 一律 JPY 整数（数据库值即日元，不除以 100）。
// amountRmb 为人民币金额，保留旧端精度（可能两位小数），与详情页 price_rmb 同源。
export interface MercariProxySubmitResult {
  orderId?: string;
  order_id?: string;
  payUrl?: string;
  pay_url?: string;
  qrcodeUrl?: string;
  qrcode_url?: string;
  amount?: number;
  amountRmb?: number;
  amount_rmb?: number;
  outTradeNo?: string;
  out_trade_no?: string;
  payOutTradeNo?: string;
  pay_out_trade_no?: string;
}

// Mercari 后端权威报价。前端不再瞎算价/手续费/增值费，一切以此为准。
// 经 /api/backend 代理 → 后端 GET /api/v1/mercari/quote?goodsNo=...，JWT 自动带。
// 手续费 feeJpy 与增值服务 valueAdded 全部来自旧系统 proxyconfirm 动态计算
// （随旧后台 shops 表 + 会员等级费实时变化，绝不写死）。
// priceJpy 为旧系统权威价（JPY 整数，例 560，不是网页抓的 300）。
// amountJpy = priceJpy + feeJpy（不含增值费，前端按勾选实时累加）。
// amountRmb 为人民币应付（保留旧端精度，可空）。
export interface MercariQuoteValueAdded {
  id: number;
  name: string;
  priceJpy: number;
}

export interface MercariQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  // amountUsd = amountJpy × 后台 USD 汇率（**已含手续费**，2 位小数）；汇率不可用时后端不返回。
  amountUsd?: number;
  // priceUsd = priceJpy × USD 汇率（单品价，不含手续费，2 位小数）；可空。
  priceUsd?: number;
  valueAdded: MercariQuoteValueAdded[];
}

// Yahoo 一口价（sokketsu）委托下单：请求/响应形状与上方 Mercari 完全同构，
// 后端经 /api/backend 代理 → /api/v1/yahoo/proxy-submit（NestJS 镜像端点）。
export type YahooProxySubmitResult = MercariProxySubmitResult;

// Yahoo 一口价后端权威报价，形状同 MercariQuote（同一批后端镜像端点产出）。
export type YahooQuoteValueAdded = MercariQuoteValueAdded;
export type YahooQuote = MercariQuote;

// 通用「网页代拍」建单结果（平台无关）。金额 JPY 整数；payAmount 按 payCurrency。
export interface ProxyBuyCreateResult {
  orderId: string;
  orderNo: string;
  platform: string;
  goodsNo: string;
  status: string;
  amountJpy: number;
  /** 实收币种：USD（en）/ CNY（zh）。 */
  payCurrency: string;
  /** 实收金额（按 payCurrency）；汇率不可用时缺省（前端只显 JPY）。 */
  payAmount?: number;
  title?: string;
  /** 履约方式：恒为 manual（人工代拍，无自动买货）。 */
  fulfillmentMode: string;
}

// NewAge（zh）收款发起结果：payUrl（跳转）或 qrcodeUrl（扫码）之一。
export interface ProxyBuyNewagePayResult {
  payUrl?: string;
  qrcodeUrl?: string;
}

interface SupportChatResponse {
  conversationId?: string;
  reply?: string;
  answer?: string;
  message?: string;
}

interface SupportTicketResponse {
  ticketNumber?: string;
  ticket_number?: string;
  number?: string;
  ticket?: {
    ticketNumber?: string;
    ticket_number?: string;
    number?: string;
  };
}

export type PublicSellerMessageRequestType = "bargain" | "question";
export type PublicSellerMessagePlatform =
  | "mercari"
  | "yahoo_auction"
  | "yahoo_shopping";

export interface PublicSellerMessageRequest {
  platform: PublicSellerMessagePlatform;
  itemUrl?: string;
  goodsNo?: string;
  type: PublicSellerMessageRequestType;
  buyerId: string;
  conversationId?: string;
  lang?: string;
  targetPriceJpy?: number;
  questionText?: string;
  customerRequestZh?: string;
  sourceTexts?: string[];
}

export interface PublicSellerMessageResponse {
  id: string;
  platform: PublicSellerMessagePlatform;
  goodsNo: string;
  itemUrl: string;
  customerId: string;
  conversationId: string;
  messageType: PublicSellerMessageRequestType | string;
  customerRequestZh: string;
  listingPriceJpy?: number | null;
  targetPriceJpy?: number | null;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
}

type LegacyProductPlatform = "yahoo" | "mercari" | "rakuten" | "amazon";

const LEGACY_PRODUCT_DETAIL_PATHS: Record<LegacyProductPlatform, string> = {
  yahoo: "/api/legacy/goods/ydetail",
  mercari: "/api/legacy/goods/mdetail",
  rakuten: "/api/legacy/goods/rdetail",
  amazon: "/api/legacy/amazon/detail",
};

export interface SupportOrderLookupItem {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  total: { amount: number; currency?: string | null };
  adminLinks?: {
    orderAdminPath?: string | null;
    paymentAdminPath?: string | null;
    refundApprovalPath?: string | null;
    auditLookupPath?: string | null;
    orderWorkflowPath?: string | null;
  };
  customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  shipping: {
    carrier?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    estimatedDelivery?: string | null;
    address?: Record<string, string | null> | null;
  };
  items: Array<{
    id: string;
    platform?: string | null;
    title: string;
    quantity: number;
    status?: string | null;
    trackingNumber?: string | null;
  }>;
  shipmentOrders: Array<{
    id: string;
    status?: string | null;
    shipWay?: string | null;
    weight: number;
    amountRmb: number;
    isPay: boolean;
    receiver: Record<string, string | boolean | null>;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface SupportOrderLookupResponse {
  items: SupportOrderLookupItem[];
  total: number;
  page: number;
  limit: number;
  safety: {
    readonly: boolean;
    masked: boolean;
    externalCarrierLookup: boolean;
    paymentSensitiveFieldsHidden: boolean;
  };
}

export type SupportConversationStatus =
  | "open"
  | "pending_human"
  | "human_active"
  | "resolved"
  | "closed"
  | "error";

export interface SupportConversationMessage {
  id: string;
  role: "visitor" | "bot" | "support";
  content: string;
  intent?: string;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  visitorName?: string | null;
  visitorEmail?: string | null;
  site?: string | null;
  language?: string | null;
  status: SupportConversationStatus;
  sourceChannel?: string | null;
  externalSessionId?: string | null;
  sourcePage?: string | null;
  sourceGoodsId?: string | null;
  sourcePlatform?: string | null;
  assignedAdminId?: string | null;
  handoffReason?: string | null;
  lastMessageAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SupportConversationMessage[];
}

export interface SupportConversationListResponse {
  data: SupportConversation[];
  total: number;
}

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";
export type ManualHandlingStatus = "unhandled" | "in_progress" | "resolved";
export type SupportTicketCategory =
  | "product"
  | "order"
  | "shipping"
  | "refund"
  | "deposit_refund"
  | "change_address"
  | "cancel_order"
  | "compensation"
  | "proxy_bid"
  | "after_sales"
  | "complaint"
  | "general"
  | "other";
export type HermesDraftStatus = "PENDING" | "READY" | "DISMISSED" | "SENT";

export interface SupportConversationSourceContext {
  sourceChannel?: string | null;
  wechatOpenid?: string | null;
  wechatUnionid?: string | null;
  externalSessionId?: string | null;
  sourcePage?: string | null;
  sourceGoodsId?: string | null;
  sourcePlatform?: string | null;
  source_channel?: string | null;
  wechat_openid?: string | null;
  wechat_unionid?: string | null;
  external_session_id?: string | null;
  source_page?: string | null;
  source_goods_id?: string | null;
  source_platform?: string | null;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  site: string;
  language: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  conversationSnapshot?: Array<Record<string, unknown>> | null;
  conversationId?: string | null;
  customerUserId?: string | null;
  relatedOrderId?: string | null;
  sourcePageUrl?: string | null;
  sourceChannel?: string | null;
  sourceGoodsId?: string | null;
  sourcePlatform?: string | null;
  wechatOpenid?: string | null;
  wechatUnionid?: string | null;
  externalSessionId?: string | null;
  sourcePage?: string | null;
  customer_user_id?: string | null;
  related_order_id?: string | null;
  source_page_url?: string | null;
  source_channel?: string | null;
  source_goods_id?: string | null;
  source_platform?: string | null;
  resolution?: string | null;
  status: SupportTicketStatus;
  handlingStatus?: ManualHandlingStatus | null;
  adminNote?: string | null;
  assignedAdminId?: string | null;
  assignedAdminEmailHash?: string | null;
  slaDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketListResponse {
  data: SupportTicket[];
  total: number;
  scope?: {
    site?: string;
    adminId?: string;
    assignedAdminId?: string;
  };
  safety?: Record<string, unknown>;
}

export interface SupportTicketContextResponse {
  ticket: SupportTicket;
  orders: SupportOrderLookupResponse;
  conversation?: SupportConversationSourceContext | null;
}

export interface HermesDraft {
  id: string;
  ticketId: string;
  jobId: string;
  status: HermesDraftStatus;
  draftBody: string | null;
  metadata: Record<string, unknown> | null;
  sentAt?: string | null;
  sentByAdminId?: string | null;
  sentMessageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExchangeCurrency = "JPY" | "CNY" | "USD";

export interface ExchangeRatesResponse {
  base: "JPY";
  rates: Record<ExchangeCurrency, number>;
  pairs: {
    jpyToCny: number;
    jpyToUsd: number;
    cnyToUsd: number;
  };
  // 可选 TCG 手续费覆盖（JPY 整数）；null = 不覆盖，TCG 站用旧 proxyconfirm 动态 feeJpy。
  tcgServiceFeeJpy: number | null;
  // 可选「高清特写拍照服务费」（JPY 整数）；null = 未配置，结算页该增值服务回退默认。
  photoServiceFeeJpy: number | null;
  source: "env" | "admin_override";
  lastUpdated: string;
  updatedBy?: string;
}

export type FeeEstimatePlatform =
  | "mercari"
  | "yahoo"
  | "yahoofrima"
  | "rakuma"
  | "amazon";

// zh /fee-compare 到手价试算：老后台实时汇率快照 + 静态平台手续费口径，
// 详见后端 src/fee-estimate/fee-estimate.service.ts 顶部注释。
export type FeeEstimateResponse =
  | { available: false }
  | {
      available: true;
      platform: FeeEstimatePlatform;
      priceJpy: number;
      shopFeeJpy: number;
      levelFeeJpy: number;
      amountJpy: number;
      rate: number;
      amountRmb: number;
      amountRmbLegacyCeil: number;
      rateAsOf: string;
    };

export interface AdminPlatformHealthItem {
  platform: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
  configured: boolean;
  credentialStatus: "configured" | "missing";
  totalProducts: number;
  lastSync: string | null;
  status: "healthy" | "attention" | "blocked";
  sample: {
    sampleId: string | null;
    sampleKind: string;
    detailPath: string | null;
    imageHosts: string[];
    credentialStatus: "configured" | "missing";
    sampleStatus: "configured" | "missing";
    sampleSource: "env" | "default" | "missing";
    sampleEnvKey?: string;
    credentialMissingKeys?: string[];
    optionalCredentialMissingKeys?: string[];
    notice: string;
  };
  sampleSmoke: {
    endpoint: string | null;
    status:
      | "passed"
      | "failed"
      | "ready_for_live_check"
      | "blocked_missing_credentials"
      | "blocked_missing_sample";
    detailStatus:
      | "passed"
      | "failed"
      | "blocked"
      | "not_checked"
      | "not_checked_legacy_bridge";
    imageStatus:
      | "passed"
      | "failed"
      | "missing"
      | "blocked"
      | "not_checked"
      | "not_checked_legacy_bridge";
    imageUrl?: string | null;
    error?: string;
    checkedAt: string;
  };
  alerts?: Array<{
    code: string;
    severity: "critical" | "warning" | string;
    message: string;
    actionPath: string;
    notification: {
      channel: "admin_console" | string;
      enabled: boolean;
      externalPush: boolean;
    };
  }>;
  notification?: {
    channel: "admin_console" | string;
    enabled: boolean;
    externalPush: boolean;
    message: string | null;
    actionPath: string;
  };
}

export type AdminPlatformHealthAlertCode =
  | "platform_blocked"
  | "missing_credentials"
  | "missing_sample"
  | "live_smoke_failed"
  | "stale_sync";

export type AdminPlatformHealthHandlingOutcome =
  | "investigating"
  | "retry_started"
  | "resolved"
  | "false_positive"
  | "escalated";

export type AdminPlatformHealthAlertHandlingStatus =
  | "unhandled"
  | "in_progress"
  | "resolved";

export interface AdminPlatformHealthAlertState {
  id: string;
  platform: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
  code: AdminPlatformHealthAlertCode;
  status: AdminPlatformHealthAlertHandlingStatus;
  severity: string;
  message: string;
  note?: string | null;
  lastOutcome?: string | null;
  lastAction?: string | null;
  lastHistoryId?: string | null;
  lastAuditLogId?: string | null;
  handledByActorId?: string | null;
  handlingCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlatformHealthAlertStateSummary {
  total: number;
  unhandled: number;
  inProgress: number;
  resolved: number;
}

export interface AdminOrderItem {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  total_currency: string;
  items_count: number;
  subtotal_jpy: number;
  subtotal_cny: number;
  shipping_fee_jpy: number;
  shipping_fee_cny: number;
  service_fee_jpy: number;
  service_fee_cny: number;
  exchange_rate_used?: number | null;
  exchange_rate_snapshot?: Record<string, unknown> | null;
  payment_method?: string | null;
  paid_at?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    product_id: string;
    title: string;
    platform: string;
    quantity: number;
    subtotal_jpy: number;
    subtotal_cny: number;
    status: string;
  }>;
  timeline?: Array<{
    key: string;
    label: string;
    at: string | null;
    done: boolean;
  }>;
  payment_link?: {
    payment_id: string;
    payment_method?: string | null;
    paid_at?: string | null;
    admin_path?: string | null;
  } | null;
  linked_context?: {
    readonly: boolean;
    order_admin_path: string;
    payment_admin_path?: string | null;
    warehouse_admin_path?: string | null;
    support_lookup_path: string;
    audit_lookup_path?: string | null;
    refund_approval_path?: string | null;
    operation_workflow_path?: string | null;
    operation_candidates?: string[];
    refund_review_candidate: boolean;
    product_sources: {
      platforms: string[];
      count: number;
      detail_links: string[];
    };
  };
}

export interface AdminLegacyOrderSnapshot {
  order_id: string;
  out_trade_no: string | null;
  goods_name: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  amount_rmb: number | null;
  status: string | null;
  created_at: string | null;
  snapshot_source: "legacy_dsr_readonly";
  fields_pending_extended_api: string[];
}

export interface AdminOrderOperationState {
  id: string;
  order_id: string;
  operation:
    | "cancel_request"
    | "refund_request"
    | "compensation_request"
    | "shipping_request";
  status: "recorded" | "in_review" | "approved" | "rejected" | "completed";
  reason?: string | null;
  note?: string | null;
  requested_amount?: number | null;
  currency?: string | null;
  actor_id?: string | null;
  audit_log_id?: string | null;
  metadata?: Record<string, unknown> | null;
  linked_context?: {
    readonly: boolean;
    order_no?: string | null;
    payment_id?: string | null;
    order_admin_path?: string | null;
    warehouse_admin_path?: string | null;
    primary_admin_path?: string | null;
    warehouse_stage?: string | null;
    payment_admin_path?: string | null;
    refund_approval_path?: string | null;
    support_lookup_path?: string | null;
    audit_lookup_path?: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface AdminWarehouseOperationHistoryItem {
  id: string;
  action: string;
  order_id?: string | null;
  shipment_order_id?: string | null;
  order_ids: string[];
  actor_id?: string | null;
  area?: string | null;
  weight?: number | null;
  after_post_fee?: number | null;
  post_fee?: number | null;
  pack_fee?: number | null;
  amount?: number | null;
  tracking_number?: string | null;
  photo_count: number;
  audit_log_id?: string | null;
  is_exception: boolean;
  handling_status?: "unhandled" | "in_progress" | "resolved" | null;
  handling_note?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  linked_context?: {
    readonly: boolean;
    warehouse_admin_path?: string | null;
    order_admin_path?: string | null;
    workflow_admin_path?: string | null;
    audit_lookup_path?: string | null;
  };
}

export interface AdminPaymentItem {
  id: string;
  paymentNo: string;
  orderId: string;
  orderNo?: string | null;
  orderLink?: {
    orderId: string;
    orderNo?: string | null;
    adminPath: string;
  };
  userId: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  expiredAt?: string | null;
  refundedAt?: string | null;
  refundAmount: number;
  refundReason?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorId?: string | null;
  actorEmailHash?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  createdAt: string;
}

export interface AdminWorkflowSummary {
  query: string;
  generatedAt: string;
  queueFilters?: {
    handlingStatus?: ManualHandlingStatus | null;
    ownerId?: string | null;
    overdueOnly?: boolean;
  };
  queueSla?: {
    refundApprovalHours: number;
    supportTicketHours: number;
    warehouseExceptionHours: number;
  };
  queueStats?: {
    total: number;
    unhandled: number;
    inProgress: number;
    resolved: number;
    overdue: number;
    unassigned: number;
    permissionBlocked?: number;
  };
  ownerOptions?: Array<{
    id: string;
    label: string;
    count: number;
    source?: "admin_account" | "legacy_queue_owner" | "unassigned" | string;
    roleId?: number | null;
    legacyMemberUid?: number | null;
    orderCategoryIds?: string[];
    permissions?: string[];
    canHandle?: string[];
  }>;
  operationQueue?: Array<{
    id: string;
    type: "refund" | "support" | "warehouse";
    requiredPermission?: string;
    label: string;
    summary: string;
    handlingStatus: ManualHandlingStatus;
    ownerId?: string | null;
    dueAt?: string | null;
    createdAt: string;
    isOverdue: boolean;
    adminPath: string;
    ownerCanHandle?: boolean;
    ownerPermissionSource?: string | null;
    blockedReason?: string | null;
  }>;
  rbac?: {
    source: string;
    legacySource: string;
    defaultAdminPermissions: string[];
    orderCategoryScope: string;
  };
  orders: Array<{
    id: string;
    orderNo: string;
    status: string;
    paymentId?: string | null;
    totalAmount: number;
    totalCurrency: string;
    createdAt: string;
    updatedAt: string;
    adminPath: string;
    warehouseAdminPath?: string | null;
  }>;
  payments: Array<{
    id: string;
    paymentNo: string;
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    method: string;
    createdAt: string;
    adminPath: string;
  }>;
  orderOperations: Array<{
    id: string;
    orderId: string;
    orderNo?: string | null;
    operation: string;
    status: string;
    reason?: string | null;
    auditLogId?: string | null;
    createdAt: string;
    adminPath: string;
    warehouseAdminPath?: string | null;
    primaryAdminPath?: string | null;
    warehouseStage?: string | null;
  }>;
  warehouseOperations: Array<{
    id: string;
    action: string;
    orderId?: string | null;
    shipmentOrderId?: string | null;
    orderIds: string[];
    actorId?: string | null;
    area?: string | null;
    weight?: number | null;
    afterPostFee?: number | null;
    postFee?: number | null;
    packFee?: number | null;
    amount?: number | null;
    trackingNumber?: string | null;
    photoCount: number;
    auditLogId?: string | null;
    isException: boolean;
    handlingStatus?: "unhandled" | "in_progress" | "resolved" | null;
    handlingNote?: string | null;
    handledBy?: string | null;
    handledAt?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    adminPath: string;
    orderAdminPath?: string | null;
  }>;
  refundApprovals: Array<{
    id: string;
    paymentId: string;
    orderId?: string | null;
    decision: string;
    reason?: string | null;
    provider: string;
    amount: number;
    currency: string;
    providerRefundAction: boolean;
    paymentStateChanged: boolean;
    handlingStatus?: ManualHandlingStatus | null;
    handlingNote?: string | null;
    handledBy?: string | null;
    handledAt?: string | null;
    createdAt: string;
    dueAt?: string | null;
    isOverdue?: boolean;
    adminPath: string;
  }>;
  supportTickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    category: string;
    subject: string;
    site: string;
    language: string;
    handlingStatus?: ManualHandlingStatus | null;
    handlingNote?: string | null;
    handledBy?: string | null;
    handledAt?: string | null;
    slaDueAt?: string | null;
    isOverdue?: boolean;
    updatedAt: string;
    adminPath: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    summary?: string | null;
    createdAt: string;
    adminPath: string;
  }>;
  links: Record<string, string>;
  safety: Record<string, unknown>;
}

export type LegacyDsrReadonlyRoute =
  | "orders.mine"
  | "orders.detail"
  | "warehouse.orders"
  | "warehouse.ships"
  | "warehouse.photos";

export type LegacyDsrReadonlyParams = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>
>;

export interface LegacyDsrReadonlySafety {
  readonly: true;
  adminOnly: true;
  source: "legacy-dsr";
  sourceRoute: string;
  upstream_status?: number;
}

export interface LegacyDsrWarehouseTimelineEntry {
  id: string;
  readonly: true;
  source: "legacy-dsr";
  sourceRoute: "api/stores/orders" | "api/stores/ships" | "api/stores/photos";
  originalAction: string;
  orderId: string | null;
  createdAt: string | null;
  metadata: {
    legacyStatus: Record<string, unknown>;
    legacyCategory: Record<string, unknown>;
    raw: Record<string, unknown>;
  };
}

export interface LegacyDsrReadonlyApiResponse<
  T = unknown,
> extends ApiResponse<T> {
  timeline?: LegacyDsrWarehouseTimelineEntry[];
  safety?: LegacyDsrReadonlySafety;
}

export type AdminMiniProgramFeatureStatus =
  | "migrated_user_side"
  | "admin_readonly_ready"
  | "preview_verified"
  | "legacy_reference_only"
  | "missing_admin_write";

export interface AdminMiniProgramSummary {
  source: {
    principle: string;
    legacyReference: string;
  };
  featureMatrix: Array<{
    key: string;
    label: string;
    legacySource: string[];
    modernModules: string[];
    status: AdminMiniProgramFeatureStatus;
    nextAction: string;
  }>;
  summaries: {
    deposit: {
      totalDeposits: number;
      refundingRequests: number;
      grossDepositAmount: number;
      userDepositBalance: number;
    };
    vip: {
      levels: number;
      totalOrders: number;
      paidOrders: number;
      unpaidOrders: number;
    };
    couponsAndScore: {
      couponDefinitions: number;
      enabledCoupons: number;
      issuedCoupons: number;
      scoreLogs: number;
    };
    sign: {
      totalLogs: number;
      todayLogs: number;
    };
    articles: {
      source: string;
      articles: number;
      categories: number;
      helpItems: number;
    };
    admins: {
      admins: number;
      importedLegacyAdmins: number;
      source: string;
    };
    platformAccountsRobot: {
      status: AdminMiniProgramFeatureStatus;
      legacySource: string[];
      nextAction: string;
      yahoo?: {
        total: number;
        active: number;
        loggedIn: number;
        cookieReady: number;
        latestLoginAt?: string | null;
        sensitiveFieldsHidden: boolean;
      };
      mercari?: {
        total: number;
        byType: Array<{
          type: string;
          count: number;
          latestAt?: string | null;
        }>;
        missingTypes: string[];
        sensitiveFieldsHidden: boolean;
      };
      robot?: {
        autoBuyEnabled: boolean;
        autoStatus?: string | null;
        autoBuyHeart?: string | null;
        heartbeatAgeMinutes?: number | null;
        heartbeatStale?: boolean | null;
        mercariTokenPresence: Array<{
          name: string;
          present: boolean;
          sensitive: boolean;
        }>;
        sensitiveFieldsHidden: boolean;
      };
    };
  };
  safety: {
    readonly: boolean;
    adminOnly: boolean;
    sharedConsole: boolean;
    noProviderMutation: boolean;
  };
}

export interface AdminLegacyYahooAccountItem {
  id: number;
  account: string;
  email?: string | null;
  status?: number | null;
  sort: number;
  loginStatus: boolean;
  lastLoginAt?: string | null;
  legacyUpdatedAt?: string | null;
  isDeleted: boolean;
  hasPassword: boolean;
  hasEmailPassword: boolean;
  hasCookies: boolean;
  cookieFingerprint?: string | null;
  updatedAt: string;
}

export interface AdminLegacyMercariDpopItem {
  id: number;
  type: string;
  hasDpop: boolean;
  dpopFingerprint?: string | null;
  legacyCreatedAt?: string | null;
  updatedAt: string;
}

export interface AdminLegacyConfigItem {
  name: string;
  valuePreview?: string | null;
  valueKind: string;
  isSensitive: boolean;
  legacyUpdatedAt?: string | null;
  updatedAt: string;
}

export interface AdminListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  safety?: Record<string, unknown>;
}

export interface AdminPaymentReconciliation {
  total: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byProvider: Record<string, { count: number; amount: number }>;
  stalePending: number;
  refundCandidates: number;
  generatedAt: string;
  safety?: Record<string, unknown>;
}

export interface AdminRefundReviewResponse {
  payment: AdminPaymentItem;
  approval: AdminRefundApprovalItem;
  lifecycleRecorded: boolean;
  lifecycle?: {
    previousDecision: string | null;
    currentDecision: string;
    nextAllowed: string[];
    terminal: boolean;
    providerRefundAction: boolean;
    paymentStateChanged: boolean;
  };
  auditRecorded: boolean;
  safety: {
    adminOnly: boolean;
    approvalOnly: boolean;
    providerRefundAction: boolean;
    paymentStateChanged: boolean;
  };
}

export interface AdminRefundExecutionResponse {
  payment: AdminPaymentItem;
  approval: AdminRefundApprovalItem;
  lifecycle?: AdminRefundReviewResponse["lifecycle"];
  execution: {
    action: string;
    providerReference?: string | null;
    providerRefundAction: boolean;
    paymentStateChanged: boolean;
    requiresManualProviderConsole: boolean;
    auditAction: string;
  };
  auditRecorded: boolean;
  safety: Record<string, unknown>;
}

export interface AdminRefundApprovalItem {
  id: string;
  paymentId: string;
  decision: "needs_review" | "approved_for_manual_refund" | "rejected" | string;
  reason?: string | null;
  actorId?: string | null;
  paymentStatus: string;
  orderId?: string | null;
  provider: string;
  amount: number;
  currency: string;
  providerRefundAction: boolean;
  paymentStateChanged: boolean;
  handlingStatus?: ManualHandlingStatus | null;
  handlingNote?: string | null;
  handledBy?: string | null;
  handledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  lifecycle?: {
    previousDecision?: string | null;
    currentDecision?: string;
    nextAllowed?: string[];
    terminal?: boolean;
    providerRefundAction?: boolean;
    paymentStateChanged?: boolean;
  } | null;
  auditLookupPath?: string | null;
  orderAdminPath?: string | null;
  createdAt: string;
}

// 客服/仓库操作台 · 押金退款审批（老后台迁移）。
// 与后端 src/deposit/deposit-refund.admin.controller.ts 的真实返回形状对齐——
// 该 controller 与 M4 客服监听器走的 internal 版共用同一个
// DepositRefundApprovalService，**不是**标准 REST 资源接口：approve/reject
// 成功也可能只有 {code:0}、没有 data，字段用 code/errcode 判成败，没有
// status/userName 这类字段。前端一律不要脑补更"规整"的形状。
// amountCny 为人民币金额（押金退款走人民币口径，与全站 JPY 整数惯例不同的这一个例外）。
export interface AdminDepositRefundPendingItem {
  orderNo: string;
  userId: string;
  amountCny: number;
  appliedAt: string;
  remark: string;
}

export interface AdminDepositRefundListData {
  list: AdminDepositRefundPendingItem[];
  // 只有调用方传了 page/limit 才会附带；不传时 pending() 原样透传
  // service.listPending() 的 {code:0,data:{list}}，没有这个字段。
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface AdminDepositRefundDetail {
  orderNo: string;
  userId: string;
  amountCny: number;
  appliedAt: string;
  status: string;
  remark: string;
  execState: {
    started: boolean;
    paidOutCny: number | null;
    legsCount: number | null;
    uncertainLegs: Array<{
      idempotency_key: string | null;
      chargeId_masked: string | null;
      amount: number | null;
      reason: string | null;
      at: string | null;
    }>;
    lease: { holder: string | null; at: string | null } | null;
  };
}

export interface AdminDepositRefundApproveSuccess {
  orderNo: string;
  refunded_cny: number;
  legs: unknown[];
}

// 押金审批 approve/reject/detail/pending 的失败信封（{code:1, errcode, errmsg, ...}）。
// 🔴 errmsg 里可能写着「钱已出/请勿重复退款」这类救命信息，refunded_cny/remaining_cny/
// detail 也是资金安全相关的真实进度，前端必须原文展示、绝不能吞成通用"操作失败"
// （见施工单要求；errcode 取值见 controller 注释：refund_execution_error/
// refund_gate_error/refund_finalize_failed/has_open_bids/partial_refund_failure/
// not_found_or_not_refunding/reject_error 等）。
export interface AdminDepositRefundFailurePayload {
  code?: number;
  errcode?: string;
  errmsg?: string;
  refunded_cny?: number | null;
  remaining_cny?: number | null;
  detail?: string;
}

export interface SupportTicketLifecycleResponse {
  ticket: SupportTicket;
  lifecycle: {
    previousStatus: SupportTicketStatus;
    currentStatus: SupportTicketStatus;
    statusChanged: boolean;
    adminNoteChanged: boolean;
    assignmentChanged: boolean;
    slaChanged: boolean;
    terminal: boolean;
    noCustomerMessageSent: boolean;
  };
  auditRecorded: boolean;
  auditLookupPath: string;
}

export interface AdminSupportHermesHealth {
  status: "online" | "offline" | "degraded" | "unconfigured" | string;
  message?: string | null;
  checkedAt?: string | null;
  agentId?: string | null;
  lastSeenAt?: string | null;
  lastError?: string | null;
  tunnelStatus?: string | null;
  version?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminSupport53KfFallbackStatus {
  fallbackStatus?: "recommended" | "enabled" | "unconfigured" | string;
  status?: "recommended" | "enabled" | "unconfigured" | string;
  enabled?: boolean | null;
  recommended?: boolean | null;
  message?: string | null;
  safety?: Record<string, unknown>;
}

export interface AdminSupportWorkbenchStatus {
  m4Hermes?: AdminSupportHermesHealth | null;
  hermes?: AdminSupportHermesHealth | null;
  kf53?: AdminSupport53KfFallbackStatus | null;
  partialErrors?: {
    hermes?: string;
    kf53?: string;
  };
  safety?: Record<string, unknown>;
}

export interface AdminPlatformHealthHistoryItem {
  id: string;
  platform: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
  status: "healthy" | "attention" | "blocked" | string;
  credentialStatus: string;
  sampleStatus: string;
  sampleId?: string | null;
  sampleSmokeStatus: string;
  detailStatus: string;
  imageStatus: string;
  imageUrl?: string | null;
  error?: string | null;
  payload: Record<string, unknown>;
  checkedAt: string;
  createdAt: string;
}

export interface AdminPlatformHealthMigrationStatus {
  tableReady: boolean;
  migrationRecorded: boolean;
  historyRows: number | null;
  checkedAt: string;
  error?: string;
  checks?: {
    platformHealth?: {
      tableReady: boolean;
      migrationRecorded: boolean;
      historyRows: number | null;
    };
    refundApprovals?: {
      tableReady: boolean;
      migrationRecorded: boolean;
      rows: number | null;
    };
    platformHealthAlertStates?: {
      tableReady: boolean;
      migrationRecorded: boolean;
      rows: number | null;
    };
  };
  schema?: AdminSchemaStatus;
  safety?: Record<string, unknown>;
}

export interface AdminSchemaTableStatus {
  key: string;
  table: string;
  label: string;
  requiredFor: string;
  migrationName?: string;
  tableReady: boolean;
  migrationRecorded: boolean | null;
  rows: number | null;
  severity: "ok" | "warning" | "blocked";
  error?: string;
}

export interface AdminSchemaStatus {
  checkedAt: string;
  allRequiredReady: boolean;
  tables: AdminSchemaTableStatus[];
  missingRequired: string[];
  safety?: Record<string, unknown>;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Request interceptor: read access token from persisted Zustand store
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.state?.accessToken ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private buildConfig(
    method: string,
    body: any,
    headers: Record<string, string>,
    credentials: RequestCredentials,
    token: string | null,
  ): RequestInit {
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
      credentials,
    };
    if (body) config.body = JSON.stringify(body);
    return config;
  }

  private parseResponse<T>(data: unknown): ApiResponse<T> {
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      // Wrapped format: { success: true, data: {...} }
      if ("success" in obj && obj.success === true) {
        return obj as unknown as ApiResponse<T>;
      }
      // NestJS backend format: { code: 0, data: {...} }
      if ("code" in obj && obj.code === 0 && "data" in obj) {
        return { success: true, data: obj.data as T };
      }
      // Direct format: { data: [...], pagination: {...} } (Railway backend)
      if ("data" in obj || "items" in obj) {
        return { success: true, data: obj as T };
      }
    }
    return { success: true, data: data as T };
  }

  private async legacyProductDetailRequest<T>(
    path: string,
    id: string,
    lang: string,
  ): Promise<ApiResponse<T>> {
    const searchParams = new URLSearchParams({
      appid: "kangaroo-japan-web",
      id,
      goodsNo: id,
      goods_no: id,
      lang,
    });

    try {
      const response = await fetch(`${path}?${searchParams.toString()}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : typeof data?.msg === "string"
                  ? data.msg
                  : response.statusText,
          },
        };
      }

      if (data?.code === 0 && data?.data) {
        return { success: true, data: data.data as T };
      }

      return {
        success: false,
        error: {
          code: String(data?.code ?? "LEGACY_PRODUCT_DETAIL_ERROR"),
          message:
            typeof data?.msg === "string"
              ? data.msg
              : "Legacy product detail request failed",
        },
      };
    } catch (error) {
      console.error("Legacy product detail request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  // Response interceptor: attempt token refresh, then retry or redirect to login
  /**
   * 401 处理：先尝试用 refresh cookie 换新 token；换不到才登出。
   * @param redirectOnFailure 换不到 token 时是否强制跳登录页。默认 true；
   *   传 false 的调用方（见 ApiOptions.skipAuthRedirect）自行降级，页面不被踢走。
   */
  private async handleUnauthorized(
    redirectOnFailure = true,
  ): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;
    let newToken: string | null = null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        newToken =
          data?.data?.tokens?.access_token ??
          data?.data?.accessToken ??
          data?.access_token ??
          null;

        if (newToken) {
          const { useAuthStore } = await import("@/lib/auth");
          useAuthStore.getState().setAccessToken(newToken);
        }
      }
    } catch {
      // refresh request failed
    }

    this.isRefreshing = false;
    this.refreshQueue.forEach((resolve) => resolve(newToken));
    this.refreshQueue = [];

    if (!newToken && redirectOnFailure && typeof window !== "undefined") {
      const { useAuthStore } = await import("@/lib/auth");
      useAuthStore.getState().logout();
      const pathParts = window.location.pathname.split("/");
      // 与 src/i18n/routing.ts 的 locales 保持一致（改那边记得同步这里）。
      // 原来只列 zh/en/ja，ko/th/id/vi 的用户会被踢到中文登录页。
      const lang = ["zh", "en", "ko", "th", "id", "vi", "ja"].includes(
        pathParts[1],
      )
        ? pathParts[1]
        : "zh";
      // 带上被拦下的这一页，登录成功后回到原处而不是首页（登录页侧会校验 next
      // 只放行站内同 locale 路径，见 [lang]/login/page.tsx 的 safeNextPath）。
      const current = `${window.location.pathname}${window.location.search}`;
      const alreadyOnLogin = current.startsWith(`/${lang}/login`);
      const nextQuery = alreadyOnLogin
        ? ""
        : `?next=${encodeURIComponent(current)}`;
      window.location.href = `/${lang}/login${nextQuery}`;
    }

    return newToken;
  }

  async request<T>(
    endpoint: string,
    options: ApiOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers = {},
      credentials = "include",
      skipAuthRedirect = false,
    } = options;

    // Request interceptor: attach Authorization header
    const token = this.getAccessToken();
    const config = this.buildConfig(method, body, headers, credentials, token);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Response interceptor: handle 401 Unauthorized
      if (response.status === 401 && !endpoint.startsWith("/auth/")) {
        const newToken = await this.handleUnauthorized(!skipAuthRedirect);
        if (!newToken) {
          return {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Session expired" },
          };
        }
        // Retry original request with refreshed token
        const retryConfig = this.buildConfig(
          method,
          body,
          headers,
          credentials,
          newToken,
        );
        const retryResponse = await fetch(
          `${this.baseUrl}${endpoint}`,
          retryConfig,
        );
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          return {
            success: false,
            error: {
              code: String(retryResponse.status),
              message:
                typeof retryData?.message === "string"
                  ? retryData.message
                  : typeof retryData?.error?.message === "string"
                    ? retryData.error.message
                    : retryResponse.statusText,
            },
          };
        }
        return this.parseResponse<T>(retryData);
      }

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : typeof data?.error?.message === "string"
                  ? data.error.message
                  : response.statusText,
          },
        };
      }
      return this.parseResponse<T>(data);
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  // Auth endpoints
  // turnstileToken 仅在 Turnstile 已配置且校验通过时存在；未配置时为 undefined/null，
  // 不会进入请求体（优雅降级，后端行为不变）。
  async login(email: string, password: string, turnstileToken?: string | null) {
    return this.request("/auth/login", {
      method: "POST",
      body: {
        email,
        password,
        ...(turnstileToken ? { turnstileToken } : {}),
      },
    });
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    preferredLanguage?: string;
    preferredCurrency?: string;
    turnstileToken?: string | null;
    // 客服发给小程序会员的注册链接携带的老后台绑定参数，三者齐全时透传给后端做注册即绑。
    legacyBindUid?: string;
    legacyBindTs?: string;
    legacyBindSig?: string;
  }) {
    const { turnstileToken, ...rest } = data;
    return this.request("/auth/register", {
      method: "POST",
      body: {
        ...rest,
        ...(turnstileToken ? { turnstileToken } : {}),
      },
    });
  }

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
    });
  }

  async refresh(refreshToken?: string) {
    return this.request("/auth/refresh", {
      method: "POST",
      body: refreshToken ? { refreshToken } : undefined,
    });
  }

  async forgotPassword(email: string, turnstileToken?: string | null) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: {
        email,
        ...(turnstileToken ? { turnstileToken } : {}),
      },
    });
  }

  async getProfile() {
    return this.request("/auth/me");
  }

  // Address endpoints
  async getAddresses() {
    return this.request("/addresses");
  }

  async getAddress(id: string) {
    return this.request(`/addresses/${id}`);
  }

  async createAddress(data: any) {
    return this.request("/addresses", {
      method: "POST",
      body: data,
    });
  }

  async updateAddress(id: string, data: any) {
    return this.request(`/addresses/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  async deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, {
      method: "DELETE",
    });
  }

  async setDefaultAddress(id: string) {
    return this.request(`/addresses/${id}/default`, {
      method: "PUT",
    });
  }

  // Product endpoints
  async getProducts(params?: {
    lang?: string;
    page?: number;
    limit?: number;
    platform?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    sort?: string;
    status?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
    if (params?.priceMin) searchParams.set("priceMin", String(params.priceMin));
    if (params?.priceMax) searchParams.set("priceMax", String(params.priceMax));
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ""}`);
  }

  async getProduct(id: string, lang = "zh") {
    return this.request(`/products/${id}?lang=${lang}`);
  }

  async getLegacyProductDetail(
    id: string,
    lang = "zh",
    platform?: string | null,
  ) {
    const normalizedPlatform = String(platform || "").toLowerCase();
    const preferredPath =
      LEGACY_PRODUCT_DETAIL_PATHS[normalizedPlatform as LegacyProductPlatform];
    const paths = [preferredPath || LEGACY_PRODUCT_DETAIL_PATHS.yahoo];

    let lastError: ApiResponse["error"];
    for (const path of paths) {
      const result = await this.legacyProductDetailRequest(path, id, lang);
      if (result.success) return result;
      lastError = result.error;
    }

    return {
      success: false,
      error: lastError || {
        code: "LEGACY_PRODUCT_DETAIL_ERROR",
        message: "Legacy product detail request failed",
      },
    };
  }

  async searchProducts(q: string, lang = "zh", page = 1, limit = 20) {
    return this.request(
      `/products/search?q=${encodeURIComponent(q)}&lang=${lang}&page=${page}&limit=${limit}`,
    );
  }

  async compareProducts(ids: string[], lang = "zh") {
    return this.request(`/products/compare?ids=${ids.join(",")}&lang=${lang}`);
  }

  async getPriceHistory(productId: string, days = 30, currency = "CNY") {
    return this.request(
      `/products/${productId}/price-history?days=${days}&currency=${currency}`,
    );
  }

  async getCategories(lang = "zh") {
    return this.request(`/categories?lang=${lang}`);
  }

  async getCategory(id: string, lang = "zh") {
    return this.request(`/categories/${id}?lang=${lang}`);
  }

  async getCategoryBySlug(slug: string, lang = "zh") {
    return this.request(`/categories/slug/${slug}?lang=${lang}`);
  }

  async getCategoryProducts(categoryId: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(
      `/categories/${categoryId}/products${query ? `?${query}` : ""}`,
    );
  }

  async getCategoryProductsBySlug(slug: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(
      `/categories/slug/${slug}/products${query ? `?${query}` : ""}`,
    );
  }

  // 统一搜索 - 并行搜索多个平台，返回统一格式
  async unifiedSearch(params: {
    keyword: string;
    page?: number;
    limit?: number;
    platforms?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set("keyword", params.keyword);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.platforms) searchParams.set("platforms", params.platforms);

    return this.request(
      `/integrations/search/unified?${searchParams.toString()}`,
    );
  }

  // Cart endpoints
  async getCart() {
    return this.request<{
      id: string;
      items: any[];
      summary: {
        totalItems: number;
        subtotalJpy: number;
        subtotalCny: number;
        subtotalUsd: number;
        estimatedShippingJpy: number;
        estimatedShippingCny: number;
        totalJpy: number;
        totalCny: number;
        currency: string;
      };
      groupedBySeller: any[];
    }>("/cart");
  }

  async addCartItem(data: {
    productId: string;
    quantity?: number;
    options?: Record<string, any>;
    buyerMessage?: string;
  }) {
    return this.request("/cart/items", {
      method: "POST",
      body: data,
    });
  }

  async updateCartItem(
    itemId: string,
    data: {
      quantity?: number;
      options?: Record<string, any>;
      buyerMessage?: string;
    },
  ) {
    return this.request(`/cart/items/${itemId}`, {
      method: "PUT",
      body: data,
    });
  }

  async removeCartItem(itemId: string) {
    return this.request(`/cart/items/${itemId}`, {
      method: "DELETE",
    });
  }

  async clearCart() {
    return this.request("/cart/items", {
      method: "DELETE",
    });
  }

  async calculateCart(addressId?: string) {
    return this.request(
      `/cart/calculate${addressId ? `?addressId=${addressId}` : ""}`,
      {
        method: "POST",
      },
    );
  }

  // Order endpoints
  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request(`/orders${query ? `?${query}` : ""}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  /**
   * 买家「我的订单」并入的**代拍单（老库 st_orders 全状态，只读）**。
   * 端点 GET /orders/legacy/mine：仅 JWT（Authorization 由 request 自动附带），
   * uid 服务端从 legacy_member_uid 派生（前端不传 uid，防 IDOR）。
   * gated 随后端 PROXYBUY_JIA_ENABLED：OFF / 未绑定 / 上游失败时后端返空，
   * data 为 []、meta.available=false，前端据此静默不展示，绝不报错。
   */
  async getMyLegacyOrders(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request(`/orders/legacy/mine${query ? `?${query}` : ""}`);
  }

  async createOrder(data: {
    addressId: string;
    currency?: string;
    items: { cartItemId?: string; productId?: string; quantity?: number }[];
    buyerMessage?: string;
    couponCode?: string;
  }) {
    return this.request("/orders", {
      method: "POST",
      body: data,
    });
  }

  private async supportRequest<T>(
    endpoint: string,
    body: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : "Support request failed",
          },
        };
      }

      return this.parseResponse<T>(data);
    } catch (error) {
      console.error("Support API request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}/cancel`, {
      method: "PUT",
    });
  }

  // Mercari 后端权威报价。组件加载时调用，拿真实商品价/手续费/增值服务列表。
  // 经 /api/backend 代理 → 后端 GET /api/v1/mercari/quote?goodsNo=...，JWT 自动带。
  // opts.tcg=true 仅 TCG（en）结算页传：才启用后台手续费/拍照费覆盖 + 返美元；
  // 中文结算页不传（默认），走旧端动态价，零影响（铁规：TCG 费用不影响中文用户）。
  /**
   * @param opts.skipAuthRedirect 未登录时不跳登录页，只返回失败让调用方降级。
   *   **只有 en TCG 详情页传 true**（该页对游客开放，detail 端点本就免登录，
   *   调用方写好了 feeJpy=null → 展示「结算时计算」的降级）。
   *   zh 经典详情页与结账页不传——它们的未登录跳登录行为保持原样。
   */
  async getMercariQuote(
    goodsNo: string,
    opts?: { tcg?: boolean; skipAuthRedirect?: boolean },
  ) {
    const tcgQuery = opts?.tcg ? "&tcg=true" : "";
    return this.request<MercariQuote>(
      `/mercari/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
      { skipAuthRedirect: opts?.skipAuthRedirect ?? false },
    );
  }

  // Mercari 委托下单 + NewAge 在线全额支付（零押金）
  // 经 /api/backend 代理 → 后端 /api/v1/mercari/proxy-submit。
  // 身份由现有登录态的 JWT 带过去，请求体不含 member_uid（后端从 JWT 取，防 IDOR）。
  // 代购流程：商品先统一入日本仓，收货地址在后续「转运/集运出库」单时再填，
  // 故下单这一刻不收地址（旧系统下单接口本就不存地址）。
  async mercariProxySubmit(data: {
    goodsNo: string;
    values?: string;
    buyerMessage?: string;
  }) {
    // 后端 DTO 仅白名单 goodsNo/values（addressId 可空且不发），且全局 ValidationPipe
    // 开了 forbidNonWhitelisted——多发任何字段（id/buyerMessage 等）都会被 400 拒绝。
    // 故只发这两个；商品号后端会自行转成旧端的 id/goods_no，无需前端重复发。
    return this.request<MercariProxySubmitResult>("/mercari/proxy-submit", {
      method: "POST",
      body: {
        goodsNo: data.goodsNo,
        values: data.values || "",
      },
    });
  }

  // Yahoo 一口价（sokketsu）后端权威报价，镜像 getMercariQuote。
  // 经 /api/backend 代理 → 后端 GET /api/v1/yahoo/quote?goodsNo=...，JWT 自动带。
  async getYahooQuote(
    goodsNo: string,
    opts?: { tcg?: boolean; skipAuthRedirect?: boolean },
  ) {
    const tcgQuery = opts?.tcg ? "&tcg=true" : "";
    return this.request<YahooQuote>(
      `/yahoo/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
      { skipAuthRedirect: opts?.skipAuthRedirect ?? false },
    );
  }

  // Yahoo 一口价委托下单 + 在线全额支付，镜像 mercariProxySubmit。
  // 经 /api/backend 代理 → 后端 /api/v1/yahoo/proxy-submit。
  async yahooProxySubmit(data: {
    goodsNo: string;
    values?: string;
    buyerMessage?: string;
  }) {
    return this.request<YahooProxySubmitResult>("/yahoo/proxy-submit", {
      method: "POST",
      body: {
        goodsNo: data.goodsNo,
        values: data.values || "",
      },
    });
  }

  // 创建 Stripe Checkout Session（仅 en TCG 结算，按美元收）。
  // 经 /api/backend 代理 → 后端 /api/v1/mercari/stripe/create-checkout-session。
  // 金额由后端从旧系统重算（服务端权威，前端不传金额）；返回 Stripe 托管页 { url }。
  // 身份由登录态 JWT 带过去（防 IDOR），与 proxy-submit 同源。
  async createStripeCheckoutSession(data: {
    orderId: string;
    goodsNo: string;
    values?: string;
    lang?: string;
  }) {
    return this.request<{ url: string }>(
      "/mercari/stripe/create-checkout-session",
      {
        method: "POST",
        body: {
          orderId: data.orderId,
          goodsNo: data.goodsNo,
          values: data.values || "",
          lang: data.lang || "en",
        },
      },
    );
  }

  // ---- 通用「网页代拍」下单（平台无关：rakuma / yahoofrima / paypay …）----
  // 经 /api/backend 代理 → 后端 /api/v1/proxy-buy/*。身份由 JWT 带过去，
  // 请求体不含身份字段（后端从 JWT 取，防 IDOR）；金额一律服务端权威（绝不发金额）。

  // 建单：服务端从权威来源算价 → 落库 pending_payment 的人工履约订单。
  async proxyBuyCreateOrder(data: {
    platform: string;
    goodsNo: string;
    tcg?: boolean;
    buyerMessage?: string;
    /**
     * 顾客自助勾选的增值服务**数字 id 串**（逗号分隔，如 "5,6"）。可空——不传时
     * 行为不变（后端不向老端发 values，现有自助下单流不回归）。后端 DTO 已 @Matches
     * 校验逗号数字串；后端不计费，仅透传给老后台按 id 查表权威收费。
     */
    valueAddedIds?: string;
  }) {
    return this.request<ProxyBuyCreateResult>("/proxy-buy/orders", {
      method: "POST",
      body: {
        platform: data.platform,
        goodsNo: data.goodsNo,
        tcg: data.tcg === true,
        ...(data.buyerMessage ? { buyerMessage: data.buyerMessage } : {}),
        ...(data.valueAddedIds ? { value_added: data.valueAddedIds } : {}),
      },
    });
  }

  // en（USD）：创建 Stripe Checkout Session，返回 { url } 跳托管收银台。
  async proxyBuyCreateStripeSession(orderId: string, lang?: string) {
    return this.request<{ url: string }>(
      "/proxy-buy/stripe/create-checkout-session",
      {
        method: "POST",
        body: { orderId, ...(lang ? { lang } : {}) },
      },
    );
  }

  // zh（CNY）：发起 NewAge 收款，返回 payUrl 或 qrcodeUrl 之一。
  async proxyBuyCreateNewagePayment(orderId: string) {
    return this.request<ProxyBuyNewagePayResult>(
      "/proxy-buy/newage/create-payment",
      {
        method: "POST",
        body: { orderId },
      },
    );
  }

  async trackOrder(id: string) {
    return this.request(`/orders/${id}/track`);
  }

  // Support endpoints
  async sendSupportChat(data: {
    message: string;
    conversationId?: string;
    language?: string;
  }) {
    return this.supportRequest<SupportChatResponse>("/api/support/chat", {
      message: data.message,
      conversationId: data.conversationId,
      site: "kangaroo-japan",
      language: data.language || "zh",
    });
  }

  // U.S. TCG site live-chat (v1: FAQ-only, English, no order lookup).
  // Posts site=kangaroo-japan-tcg + faqOnly:true so the same-origin
  // /api/support/chat route takes the isolated English FAQ path → Hermes,
  // never running personalized order/deposit/shipment status. Order lookup is
  // deferred to phase 2 once TCG user ↔ legacy order mapping is wired.
  async sendTcgSupportChat(data: { message: string; conversationId?: string }) {
    return this.supportRequest<SupportChatResponse>("/api/support/chat", {
      message: data.message,
      conversationId: data.conversationId,
      site: "kangaroo-japan-tcg",
      language: "en",
      faqOnly: true,
      sourceChannel: "tcg_web_widget",
    });
  }

  async createSupportTicket(data: {
    name?: string;
    email: string;
    subject: string;
    category: string;
    description: string;
    language?: string;
  }) {
    return this.supportRequest<SupportTicketResponse>("/api/support/tickets", {
      visitorName: data.name || data.email,
      visitorEmail: data.email,
      site: "kangaroo-japan",
      language: data.language || "zh",
      category: data.category || "general",
      subject: data.subject,
      description: data.description,
    });
  }

  async createPublicSellerMessage(data: PublicSellerMessageRequest) {
    return this.request<PublicSellerMessageResponse>(
      "/seller-messages/visitor/leave-message",
      {
        method: "POST",
        body: data,
      },
    );
  }

  async lookupSupportOrders(params: {
    orderNo?: string;
    email?: string;
    phone?: string;
    trackingNumber?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.orderNo) searchParams.set("orderNo", params.orderNo);
    if (params.email) searchParams.set("email", params.email);
    if (params.phone) searchParams.set("phone", params.phone);
    if (params.trackingNumber)
      searchParams.set("trackingNumber", params.trackingNumber);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<SupportOrderLookupResponse>(
      `/support/orders/lookup${query ? `?${query}` : ""}`,
    );
  }

  async listSupportTickets(params?: {
    site?: string;
    category?: SupportTicketCategory;
    status?: SupportTicketStatus;
    handlingStatus?: ManualHandlingStatus;
    assignedAdminId?: string;
    overdueOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.site) searchParams.set("site", params.site);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.handlingStatus)
      searchParams.set("handlingStatus", params.handlingStatus);
    if (params?.assignedAdminId)
      searchParams.set("assignedAdminId", params.assignedAdminId);
    if (params?.overdueOnly) searchParams.set("overdueOnly", "true");
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<SupportTicketListResponse>(
      `/support/tickets${query ? `?${query}` : ""}`,
    );
  }

  async updateSupportTicketLifecycle(
    ticketId: string,
    data: {
      status?: SupportTicketStatus;
      adminNote?: string | null;
      assignedAdminId?: string | null;
      slaDueAt?: string | null;
    },
  ) {
    return this.request<SupportTicketLifecycleResponse>(
      `/support/admin/tickets/${ticketId}/lifecycle`,
      {
        method: "POST",
        body: data,
      },
    );
  }

  async bulkClaimSupportTickets(data: {
    ticketIds: string[];
    assignedAdminId?: string | null;
    adminNote?: string | null;
    slaDueAt?: string | null;
  }) {
    return this.request<{
      tickets: SupportTicket[];
      claimedCount: number;
      auditRecorded: boolean;
    }>("/support/admin/tickets/bulk-claim", {
      method: "POST",
      body: data,
    });
  }

  async getSupportTicketContext(ticketId: string) {
    return this.request<SupportTicketContextResponse>(
      `/support/admin/tickets/${ticketId}/context`,
    );
  }

  async listHermesDraftsForTicket(ticketId: string) {
    return this.request<HermesDraft[]>(
      `/support/admin/tickets/${ticketId}/hermes/drafts`,
    );
  }

  async getAdminSupportHermesHealth() {
    return this.request<AdminSupportHermesHealth>(
      "/support/admin/hermes/health",
    );
  }

  async getAdminSupport53KfFallback() {
    return this.request<AdminSupport53KfFallbackStatus>(
      "/support/admin/support/fallback/53kf",
    );
  }

  async listSupportConversations(params?: {
    status?: SupportConversationStatus;
    sourceChannel?: string;
    assignedAdminId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.sourceChannel)
      searchParams.set("sourceChannel", params.sourceChannel);
    if (params?.assignedAdminId)
      searchParams.set("assignedAdminId", params.assignedAdminId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<SupportConversationListResponse>(
      `/support/admin/conversations${query ? `?${query}` : ""}`,
    );
  }

  async getSupportConversation(id: string) {
    return this.request<SupportConversation>(
      `/support/admin/conversations/${id}`,
    );
  }

  async claimSupportConversation(
    id: string,
    data?: { assignedAdminId?: string | null; adminNote?: string | null },
  ) {
    return this.request<{
      conversation: SupportConversation;
      auditRecorded: boolean;
    }>(`/support/admin/conversations/${id}/claim`, {
      method: "POST",
      body: data || {},
    });
  }

  async sendSupportConversationMessage(id: string, content: string) {
    return this.request<{
      message: SupportConversationMessage;
      conversation: SupportConversation;
      customerDelivery: {
        mode: "polling";
        customerVisible: boolean;
        activePushSent: boolean;
      };
    }>(`/support/admin/conversations/${id}/messages`, {
      method: "POST",
      body: { content },
    });
  }

  async closeSupportConversation(id: string, reason?: string | null) {
    return this.request<{
      conversation: SupportConversation;
      auditRecorded: boolean;
    }>(`/support/admin/conversations/${id}/close`, {
      method: "POST",
      body: { reason: reason || null },
    });
  }

  async getAdminPlatformHealth() {
    return this.request<{
      data: AdminPlatformHealthItem[];
      alerts?: {
        total: number;
        blocked: number;
        attention: number;
        notifications?: Array<Record<string, unknown>>;
      };
      alertStates?: AdminPlatformHealthAlertStateSummary;
      safety: Record<string, unknown>;
    }>("/integrations/admin/health");
  }

  async getAdminPlatformHealthHistory(params?: {
    platform?: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
    status?: "healthy" | "attention" | "blocked";
    alertCode?:
      | "platform_blocked"
      | "missing_credentials"
      | "missing_sample"
      | "live_smoke_failed"
      | "stale_sync";
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.alertCode) searchParams.set("alertCode", params.alertCode);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<{
      data: AdminPlatformHealthHistoryItem[];
      alerts?: { total: number; blocked: number; attention: number };
      safety: Record<string, unknown>;
    }>(`/integrations/admin/health/history${query ? `?${query}` : ""}`);
  }

  async getAdminPlatformHealthAlertStates(params?: {
    platform?: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
    code?: AdminPlatformHealthAlertCode;
    status?: AdminPlatformHealthAlertHandlingStatus;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.code) searchParams.set("code", params.code);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<{
      data: AdminPlatformHealthAlertState[];
      summary: AdminPlatformHealthAlertStateSummary;
      safety: Record<string, unknown>;
    }>(`/integrations/admin/health/alert-states${query ? `?${query}` : ""}`);
  }

  async getAdminPlatformHealthMigrationStatus() {
    return this.request<AdminPlatformHealthMigrationStatus>(
      "/integrations/admin/health/migration-status",
    );
  }

  async getAdminSchemaStatus() {
    return this.request<AdminSchemaStatus>("/integrations/admin/schema-status");
  }

  async runAdminPlatformHealthSmoke() {
    return this.request<{
      data: AdminPlatformHealthItem[];
      persistence: AdminPlatformHealthMigrationStatus;
      alerts?: {
        total: number;
        blocked: number;
        attention: number;
        notifications?: Array<Record<string, unknown>>;
      };
      alertStates?: AdminPlatformHealthAlertStateSummary;
      safety: Record<string, unknown>;
    }>("/integrations/admin/health/smoke", {
      method: "POST",
    });
  }

  async retryPlatformSync(data: {
    platform: "yahoo" | "rakuten" | "amazon" | "mercari";
    keyword: string;
  }) {
    return this.request<{
      result: {
        platform: string;
        keyword: string;
        found: number;
        synced: number;
        success: boolean;
        error?: string;
      };
      safety: Record<string, unknown>;
    }>("/integrations/admin/sync/retry", {
      method: "POST",
      body: data,
    });
  }

  async acknowledgePlatformHealthAlert(data: {
    platform: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
    code: AdminPlatformHealthAlertCode;
    historyId?: string;
    note?: string;
  }) {
    return this.request<{
      action: "acknowledged";
      alert: Record<string, unknown>;
      audit: { id?: string; action?: string } | null;
      state?: AdminPlatformHealthAlertState | null;
      safety: Record<string, unknown>;
    }>("/integrations/admin/health/alerts/acknowledge", {
      method: "POST",
      body: data,
    });
  }

  async handlePlatformHealthAlert(data: {
    platform: "yahoo" | "yahoo-shopping" | "rakuten" | "amazon" | "mercari";
    code: AdminPlatformHealthAlertCode;
    historyId?: string;
    outcome?: AdminPlatformHealthHandlingOutcome;
    note?: string;
    nextAction?: string;
  }) {
    return this.request<{
      action: "handling_recorded";
      alert: Record<string, unknown>;
      audit: { id?: string; action?: string } | null;
      state?: AdminPlatformHealthAlertState | null;
      safety: Record<string, unknown>;
    }>("/integrations/admin/health/alerts/handle", {
      method: "POST",
      body: data,
    });
  }

  async listAdminOrders(params?: {
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminOrderItem>>(
      `/orders/admin${query ? `?${query}` : ""}`,
    );
  }

  async getAdminLegacyOrderSnapshot(orderId: string) {
    return this.request<AdminLegacyOrderSnapshot>(
      `/admin/orders/${encodeURIComponent(orderId)}/legacy-snapshot`,
    );
  }

  async listAdminOrderOperations(params?: {
    orderId?: string;
    operation?: AdminOrderOperationState["operation"];
    status?: AdminOrderOperationState["status"];
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.orderId) searchParams.set("orderId", params.orderId);
    if (params?.operation) searchParams.set("operation", params.operation);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminOrderOperationState>>(
      `/orders/admin/operations${query ? `?${query}` : ""}`,
    );
  }

  async listAdminWarehouseOperationHistory(params?: {
    q?: string;
    orderId?: string;
    shipmentOrderId?: string;
    action?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
    exceptionOnly?: boolean;
    handlingStatus?: "unhandled" | "in_progress" | "resolved" | string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.orderId) searchParams.set("orderId", params.orderId);
    if (params?.shipmentOrderId)
      searchParams.set("shipmentOrderId", params.shipmentOrderId);
    if (params?.action) searchParams.set("action", params.action);
    if (params?.actorId) searchParams.set("actorId", params.actorId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.exceptionOnly) searchParams.set("exceptionOnly", "true");
    if (params?.handlingStatus)
      searchParams.set("handlingStatus", params.handlingStatus);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminWarehouseOperationHistoryItem>>(
      `/warehouse/history${query ? `?${query}` : ""}`,
    );
  }

  async updateAdminWarehouseOperationHandling(
    id: string,
    data: {
      status: "unhandled" | "in_progress" | "resolved";
      note?: string | null;
    },
  ) {
    return this.request<AdminWarehouseOperationHistoryItem>(
      `/warehouse/history/${encodeURIComponent(id)}/handling`,
      {
        method: "PATCH",
        body: data,
      },
    );
  }

  async recordAdminOrderOperation(
    orderId: string,
    data: {
      operation:
        | "cancel_request"
        | "refund_request"
        | "compensation_request"
        | "shipping_request";
      reason?: string | null;
      note?: string | null;
      requestedAmount?: number | null;
      currency?: string | null;
    },
  ) {
    return this.request<{
      order: AdminOrderItem;
      workflow: Record<string, unknown>;
      operationState: AdminOrderOperationState | null;
      auditRecorded: boolean;
    }>(`/orders/admin/${orderId}/operations`, {
      method: "POST",
      body: data,
    });
  }

  async updateAdminOrderOperationStatus(
    operationId: string,
    data: {
      status: AdminOrderOperationState["status"];
      note?: string | null;
    },
  ) {
    return this.request<{
      operationState: AdminOrderOperationState;
      workflow: Record<string, unknown>;
      auditRecorded: boolean;
    }>(`/orders/admin/operations/${operationId}/status`, {
      method: "PATCH",
      body: data,
    });
  }

  async listAdminPayments(params?: {
    status?: string;
    provider?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.provider) searchParams.set("provider", params.provider);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminPaymentItem>>(
      `/payments/admin${query ? `?${query}` : ""}`,
    );
  }

  async getAdminPaymentReconciliation() {
    return this.request<AdminPaymentReconciliation>(
      "/payments/admin/reconciliation",
    );
  }

  async listAdminRefundApprovals(params?: {
    paymentId?: string;
    handlingStatus?: ManualHandlingStatus;
    handledBy?: string;
    overdueOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.paymentId) searchParams.set("paymentId", params.paymentId);
    if (params?.handlingStatus)
      searchParams.set("handlingStatus", params.handlingStatus);
    if (params?.handledBy) searchParams.set("handledBy", params.handledBy);
    if (params?.overdueOnly) searchParams.set("overdueOnly", "true");
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminRefundApprovalItem>>(
      `/payments/admin/refund-approvals${query ? `?${query}` : ""}`,
    );
  }

  async updateAdminRefundApprovalHandling(
    approvalId: string,
    data: {
      status: ManualHandlingStatus;
      note?: string | null;
    },
  ) {
    return this.request<{
      approval: AdminRefundApprovalItem;
      auditRecorded: boolean;
      safety: Record<string, unknown>;
    }>(`/payments/admin/refund-approvals/${approvalId}/handling`, {
      method: "PATCH",
      body: data,
    });
  }

  async bulkClaimAdminRefundApprovals(data: {
    approvalIds: string[];
    note?: string | null;
  }) {
    return this.request<{
      approvals: AdminRefundApprovalItem[];
      auditRecorded: boolean;
      safety: Record<string, unknown>;
    }>("/payments/admin/refund-approvals/bulk-claim", {
      method: "POST",
      body: data,
    });
  }

  async recordAdminRefundReview(
    paymentId: string,
    data: {
      decision:
        | "needs_review"
        | "finance_review"
        | "approved_for_manual_refund"
        | "manual_refund_processing"
        | "manual_refund_completed"
        | "rejected";
      reason?: string | null;
    },
  ) {
    return this.request<AdminRefundReviewResponse>(
      `/payments/admin/${paymentId}/refund-review`,
      {
        method: "POST",
        body: data,
      },
    );
  }

  async recordAdminRefundExecution(
    paymentId: string,
    data: {
      action:
        | "start_manual_refund"
        | "complete_manual_refund"
        | "mark_provider_blocked";
      reason?: string | null;
      providerReference?: string | null;
    },
  ) {
    return this.request<AdminRefundExecutionResponse>(
      `/payments/admin/${paymentId}/refund-execution`,
      {
        method: "POST",
        body: data,
      },
    );
  }

  // 客服/仓库操作台 · 押金退款审批（对应老后台"会员押金退款"审核）。
  // 端点固定是 /pending（不是 ?status= 查询参数），与 controller 的
  // @Get('pending') 对齐。
  async listAdminDepositRefunds(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminDepositRefundListData | AdminDepositRefundFailurePayload>(
      `/admin/deposit-refunds/pending${query ? `?${query}` : ""}`,
    );
  }

  async getAdminDepositRefund(orderNo: string) {
    return this.request<AdminDepositRefundDetail | AdminDepositRefundFailurePayload>(
      `/admin/deposit-refunds/${orderNo}`,
    );
  }

  // resolution 仅用于「人工核实结果未知的一腿」续跑场景，本操作台基础审批
  // 流程不填；body 必须是对象（哪怕空 {}）——AdminApproveDepositRefundDto
  // 全字段可选但走 class-validator，不传 body 也能过，这里显式传 {} 更清楚。
  async approveAdminDepositRefund(
    orderNo: string,
    resolution?: { resolveLegKey: string; resolveLegOutcome: "refunded" | "not_refunded" },
  ) {
    return this.request<
      AdminDepositRefundApproveSuccess | AdminDepositRefundFailurePayload
    >(`/admin/deposit-refunds/${orderNo}/approve`, {
      method: "POST",
      body: resolution || {},
    });
  }

  async rejectAdminDepositRefund(orderNo: string, reason?: string) {
    return this.request<{ code?: number } | AdminDepositRefundFailurePayload>(
      `/admin/deposit-refunds/${orderNo}/reject`,
      { method: "POST", body: reason ? { reason } : {} },
    );
  }

  async listAdminAuditLogs(params?: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.set("action", params.action);
    if (params?.resourceType)
      searchParams.set("resourceType", params.resourceType);
    if (params?.resourceId) searchParams.set("resourceId", params.resourceId);
    if (params?.actorId) searchParams.set("actorId", params.actorId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminAuditLogItem>>(
      `/admin/audit-logs${query ? `?${query}` : ""}`,
    );
  }

  async getAdminWorkflowOrderSummary(params?: {
    q?: string;
    limit?: number;
    handlingStatus?: ManualHandlingStatus;
    ownerId?: string;
    overdueOnly?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.handlingStatus)
      searchParams.set("handlingStatus", params.handlingStatus);
    if (params?.ownerId) searchParams.set("ownerId", params.ownerId);
    if (params?.overdueOnly) searchParams.set("overdueOnly", "true");
    const query = searchParams.toString();
    return this.request<AdminWorkflowSummary>(
      `/admin/workflows/order-summary${query ? `?${query}` : ""}`,
    );
  }

  private legacyDsrHeaders(legacyToken?: string) {
    const token = legacyToken?.trim();
    return token ? { "x-dsr-legacy-token": token } : undefined;
  }

  async getAdminLegacyDsrOrdersMine(
    params: LegacyDsrReadonlyParams,
    legacyToken?: string,
  ) {
    return this.request<unknown>("/orders/admin/legacy-dsr/mine", {
      method: "POST",
      body: params,
      headers: this.legacyDsrHeaders(legacyToken),
    }) as Promise<LegacyDsrReadonlyApiResponse>;
  }

  async getAdminLegacyDsrOrdersDetail(
    params: LegacyDsrReadonlyParams,
    legacyToken?: string,
  ) {
    return this.request<unknown>("/orders/admin/legacy-dsr/detail", {
      method: "POST",
      body: params,
      headers: this.legacyDsrHeaders(legacyToken),
    }) as Promise<LegacyDsrReadonlyApiResponse>;
  }

  async getAdminLegacyDsrWarehouseOrders(
    params: LegacyDsrReadonlyParams,
    legacyToken?: string,
  ) {
    return this.request<unknown>("/warehouse/legacy-dsr/orders", {
      method: "POST",
      body: params,
      headers: this.legacyDsrHeaders(legacyToken),
    }) as Promise<LegacyDsrReadonlyApiResponse>;
  }

  async getAdminLegacyDsrWarehouseShips(
    params: LegacyDsrReadonlyParams,
    legacyToken?: string,
  ) {
    return this.request<unknown>("/warehouse/legacy-dsr/ships", {
      method: "POST",
      body: params,
      headers: this.legacyDsrHeaders(legacyToken),
    }) as Promise<LegacyDsrReadonlyApiResponse>;
  }

  async getAdminLegacyDsrWarehousePhotos(
    params: LegacyDsrReadonlyParams,
    legacyToken?: string,
  ) {
    return this.request<unknown>("/warehouse/legacy-dsr/photos", {
      method: "POST",
      body: params,
      headers: this.legacyDsrHeaders(legacyToken),
    }) as Promise<LegacyDsrReadonlyApiResponse>;
  }

  async getAdminMiniProgramSummary() {
    return this.request<AdminMiniProgramSummary>("/admin/mini-program/summary");
  }

  async listAdminLegacyYahooAccounts(params?: {
    q?: string;
    loginStatus?: "true" | "false" | "all";
    hasCookies?: "true" | "false" | "all";
    isDeleted?: "true" | "false" | "all";
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.loginStatus && params.loginStatus !== "all")
      searchParams.set("loginStatus", params.loginStatus);
    if (params?.hasCookies && params.hasCookies !== "all")
      searchParams.set("hasCookies", params.hasCookies);
    if (params?.isDeleted && params.isDeleted !== "all")
      searchParams.set("isDeleted", params.isDeleted);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminLegacyYahooAccountItem>>(
      `/admin/mini-program/platform-robot/yahoo-accounts${query ? `?${query}` : ""}`,
    );
  }

  async listAdminLegacyMercariDpops(params?: {
    type?: string;
    hasDpop?: "true" | "false" | "all";
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.hasDpop && params.hasDpop !== "all")
      searchParams.set("hasDpop", params.hasDpop);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminLegacyMercariDpopItem>>(
      `/admin/mini-program/platform-robot/mercari-dpops${query ? `?${query}` : ""}`,
    );
  }

  async listAdminLegacyConfigs(params?: {
    q?: string;
    isSensitive?: "true" | "false" | "all";
    robotOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.isSensitive && params.isSensitive !== "all")
      searchParams.set("isSensitive", params.isSensitive);
    if (params?.robotOnly) searchParams.set("robotOnly", "true");
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminLegacyConfigItem>>(
      `/admin/mini-program/platform-robot/configs${query ? `?${query}` : ""}`,
    );
  }

  async triggerHermesDraft(data: { ticketId: string; promptContext?: string }) {
    return this.request<{ jobId: string }>("/support/admin/hermes/jobs", {
      method: "POST",
      body: data,
    });
  }

  async getHermesDraft(jobId: string) {
    return this.request<HermesDraft>(`/support/admin/hermes/drafts/${jobId}`);
  }

  async dismissHermesDraft(jobId: string, reason?: string) {
    return this.request<HermesDraft>(
      `/support/admin/hermes/drafts/${jobId}/dismiss`,
      {
        method: "POST",
        body: { reason },
      },
    );
  }

  async sendHermesDraft(jobId: string) {
    return this.request<{
      draft: HermesDraft;
      ticket: SupportTicket;
      message: { id: string; conversationId: string; createdAt: string };
      auditRecorded: boolean;
      safety: {
        reviewedBeforeSend: boolean;
        knowledgeOnly: boolean;
        customerScopeOnly: boolean;
        externalTransport: boolean;
      };
    }>(`/support/admin/hermes/drafts/${jobId}/send`, {
      method: "POST",
      body: {},
    });
  }

  // Exchange rate admin endpoints
  async getExchangeRates() {
    return this.request<ExchangeRatesResponse>("/exchange-rates");
  }

  // zh 到手价试算（/fee-compare 页专用，公开只读，不需要登录）。
  async getFeeEstimate(platform: FeeEstimatePlatform, priceJpy: number) {
    const params = new URLSearchParams({
      platform,
      priceJpy: String(Math.trunc(priceJpy)),
    });
    return this.request<FeeEstimateResponse>(
      `/fee-estimate?${params.toString()}`,
    );
  }

  async updateExchangeRates(data: {
    jpyToCny?: number;
    jpyToUsd?: number;
    cnyToUsd?: number;
    // 可选 TCG 手续费覆盖（JPY 整数）：传 null 清除覆盖（回退动态费），不传保持现值。
    tcgServiceFeeJpy?: number | null;
    // 可选「高清特写拍照服务费」（JPY 整数）：传 null 清除（结算页回退默认），不传保持现值。
    photoServiceFeeJpy?: number | null;
  }) {
    return this.request<ExchangeRatesResponse>("/exchange-rates/admin", {
      method: "PATCH",
      body: data,
    });
  }

  // Payment endpoints
  async createPaymentIntent(data: {
    orderId: string;
    method?: "stripe" | "alipay" | "wechat_pay";
    paymentMethodTypes?: string[];
    currency?: "CNY" | "USD" | "JPY";
  }) {
    return this.request("/payments/create-intent", {
      method: "POST",
      body: data,
    });
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string) {
    return this.request(`/payments/${paymentId}/confirm`, {
      method: "POST",
      body: { payment_method_id: paymentMethodId },
    });
  }

  async cancelPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}/cancel`, {
      method: "POST",
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/${paymentId}`);
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.request(`/payments/${paymentId}/refund`, {
      method: "POST",
      body: { amount, reason },
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
