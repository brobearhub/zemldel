export function shouldShowProviderPaymentPanel(input: {
  isLocked: boolean;
  canProposePrice: boolean;
  canAcceptPrice: boolean;
}): boolean {
  return (
    !input.isLocked || input.canProposePrice || input.canAcceptPrice
  );
}
