# Тема приложения

Источник токенов: `frontend/core/theme/createAppTheme.ts`.  
Превью палитры в UI: `/themes`.

Тёмная тема не менялась.

## Светлая тема (текущая, с 2026-09-05)

Палитра по скриншотам [Sotheby's Motorsport](https://sothebysmotorsport.com/): крем, sage green, глубокий зелёный текст, оранжевый только как `info`.

| Роль | Токен | Значение |
| --- | --- | --- |
| Фон страницы и шапка | `background.default`, `custom.bgColors.header` | `#f0f0e6` |
| Карточки / инпуты | `background.paper` | `#ffffff` |
| Активная кнопка / primary / футер | `primary.main`, `custom.bgColors.secondary` | `#a0b4a0` |
| Текст на sage-кнопке | `primary.contrastText` | `#000000` |
| Неактивная кнопка | `action.disabledBackground` | `#e0e0e0` (`rgba(0,0,0,.12)` на белом) |
| Контрастная кнопка (I Agree) | `secondary.main` | `#000000` |
| Login / акцент логотипа | `info.main` | `#FF4B14` |
| Основной текст | `text.primary` | `#325e49` (глубокий лесной) |
| Вторичный текст | `text.secondary` | `#6e7471` (серо-зелёный) |
| Success | `success.main` | `#548a5c` (sage с чуть большим зелёным) |
| Warning / error | без изменений | MUI semantic |

`info` — оранжевый Login с сайта: это не primary и не secondary.

## Архив: светлая тема до 2026-09-05

Предыдущая светлая тема на MUI-примитивах (teal / grey / brown). Значения ниже — чтобы можно было вернуть палитру без git-археологии.

| Токен | Было |
| --- | --- |
| `background.default` | `grey[100]` → `#f5f5f5` |
| `background.paper` | `common.white` → `#ffffff` |
| `common.gray` | `grey[500]` → `#9e9e9e` |
| `primary.main` | `teal[800]` → `#00695c` |
| `primary.light` | `teal[700]` → `#00796b` |
| `primary.dark` | `teal[900]` → `#004d40` |
| `primary.contrastText` | `common.white` → `#ffffff` |
| `secondary.main` | `grey[800]` → `#424242` |
| `secondary.light` | `grey[700]` → `#616161` |
| `secondary.dark` | `grey[900]` → `#212121` |
| `secondary.contrastText` | `common.white` → `#ffffff` |
| `info.main` | `deepOrange[500]` → `#ff5722` |
| `success.main` | `green[800]` → `#2e7d32` |
| `warning.main` | `lime[900]` → `#827717` |
| `error.main` | `red[600]` → `#e53935` |
| `divider` | `alpha(grey[800], 0.12)` → `rgba(66, 66, 66, 0.12)` |
| `text.primary` | `brown[600]` → `#6d4c41` |
| `text.secondary` | `alpha(grey[900], 0.65)` → `rgba(33, 33, 33, 0.65)` |
| `custom.bgColors.secondary` (шапка/подвал) | `grey[800]` → `#424242` |
