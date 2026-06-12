UPDATE "CreditPackage"
SET
  "credits" = 100,
  "bonusCredits" = 0,
  "priceCents" = 1290,
  "description" = '适合先体验图片生成和提示词润色。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = '入门包';

UPDATE "CreditPackage"
SET
  "credits" = 500,
  "bonusCredits" = 60,
  "priceCents" = 4900,
  "description" = '日常创作推荐，额外赠送 60 积分。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = '创作包';

UPDATE "CreditPackage"
SET
  "credits" = 1200,
  "bonusCredits" = 180,
  "priceCents" = 10900,
  "description" = '适合高频生成，额外赠送 180 积分。',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = '专业包';

UPDATE "AppSetting"
SET
  "value" = 'gpt-image-2',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'openaiImageModel' AND "value" = 'gpt-image-1';
