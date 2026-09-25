export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  DOCUMENT_NOT_FOUND: "目标政策版本不存在或已被清理",
  DOCUMENT_HAS_ASSOCIATIONS: "该版本存在关联的差异、风险或审阅记录，只能归档，不能彻底删除",
  DUPLICATE_ACTIVE_TITLE: "活动列表已存在同名政策版本，请先处理该记录后再恢复"
};
