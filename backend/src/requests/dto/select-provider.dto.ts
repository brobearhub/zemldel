export function formatCustomerSelectProviderChatMessage(reRequested: boolean): string {
  return reRequested
    ? 'Заказчик снова предложил вам выполнить заявку'
    : 'Заказчик выбрал вас исполнителем';
}
