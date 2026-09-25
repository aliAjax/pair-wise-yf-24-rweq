export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  DUPLICATE_ACTIVE_TITLE: "活动列表中已存在同名政策，请先处理那份记录，再恢复归档版本",
  DOCUMENT_HAS_RELATIONS: "该版本存在关联的差异、风险或审阅记录，无法彻底清理，仅可归档保留",
  ARCHIVED_READ_ONLY: "归档版本内容只读，仅支持查看与导出"
};
