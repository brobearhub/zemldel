-- Вход и step-up через Госуслуги убраны из продукта: таблицы связей и enum больше не нужны.
DROP TABLE "UserAuthProviderLink";
DROP TABLE "UserStepUpVerification";
DROP TYPE "AuthProviderKey";
