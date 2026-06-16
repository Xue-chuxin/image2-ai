# 阶段 11B：StorageService 正式化

本阶段把生成图、参考图和支付凭证统一接入 `StorageService`。当前已实现 `local` 本地存储，`oss`、`cos`、`s3` 已预留配置和运行时结构，后续接入对应 SDK 时不需要改业务调用方。

## 1. 已接入范围

统一存储入口：

```text
src/lib/storage.ts
```

当前业务调用方：

- 生图结果：`saveGeneratedImage`
- 参考图上传：`saveReferenceImage`
- 支付凭证：`savePaymentProof`

所有调用方继续使用函数接口，不再直接拼 `public/generated` 或 `public/uploads`。

## 2. 后台配置字段

后台路径：

```text
/admin/settings
```

新增“图片存储”配置：

- `storageProvider`：`local`、`oss`、`cos`、`s3`
- `storageLocalBaseDir`：本地根目录，默认 `public/storage`
- `storagePublicBaseUrl`：公开访问域名，留空时使用站点相对路径
- `storageGeneratedPrefix`：生成图前缀，默认 `generated`
- `storageUploadsPrefix`：上传图前缀，默认 `uploads`
- `storageEndpoint`：对象存储 Endpoint 预留
- `storageBucket`：对象存储 Bucket 预留
- `storageRegion`：对象存储 Region 预留

## 3. 默认 local 路径

默认配置：

```env
STORAGE_PROVIDER="local"
STORAGE_LOCAL_BASE_DIR="public/storage"
STORAGE_PUBLIC_BASE_URL=""
STORAGE_GENERATED_PREFIX="generated"
STORAGE_UPLOADS_PREFIX="uploads"
```

生成图保存为：

```text
public/storage/generated/<jobId>-1.png
public/storage/generated/thumbs/<jobId>-1.png
```

参考图保存为：

```text
public/storage/uploads/reference/<userId>-<timestamp>.png
public/storage/uploads/reference/thumbs/<userId>-<timestamp>.png
```

支付凭证保存为：

```text
public/storage/uploads/payments/<userId>-<orderId>-<timestamp>.png
```

## 4. 公开 URL 规则

`storagePublicBaseUrl` 留空：

```text
/storage/generated/xxx.png
/storage/uploads/reference/xxx.png
```

配置为 CDN 或对象存储域名：

```env
STORAGE_PUBLIC_BASE_URL="https://cdn.example.com"
```

返回 URL：

```text
https://cdn.example.com/generated/xxx.png
https://cdn.example.com/uploads/reference/xxx.png
```

## 5. Docker 持久化目录

`docker-compose.yml` 已挂载：

```text
image2_generated -> /app/public/generated
image2_uploads -> /app/public/uploads
```

这样容器重建后生成图和上传图不会丢失。

## 6. 当前限制

当前版本只真正实现：

```text
local
```

如果后台选择：

```text
oss / cos / s3
```

保存图片时会返回明确错误：

```text
当前版本仅实现 local 存储，xxx 已预留配置但尚未接入对象存储 SDK。
```

后续接入对象存储时，建议只扩展 `src/lib/storage.ts`，不要改生成任务、上传、支付凭证等业务模块。
