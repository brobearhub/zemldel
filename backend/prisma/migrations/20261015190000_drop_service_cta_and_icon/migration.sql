-- Текст кнопки, ссылка и значок больше не часть карточки услуги.
-- Цвет остаётся и красится на метке.

ALTER TABLE "Service" DROP COLUMN "ctaText";
ALTER TABLE "Service" DROP COLUMN "ctaHref";
ALTER TABLE "Service" DROP COLUMN "icon";
