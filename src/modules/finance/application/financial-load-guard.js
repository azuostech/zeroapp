export function shouldApplyFinancialLoad({
  mounted,
  requestSequence,
  latestSequence,
  requestedPeriodKey,
  selectedPeriodKey
}) {
  return Boolean(
    mounted &&
    requestSequence === latestSequence &&
    requestedPeriodKey &&
    requestedPeriodKey === selectedPeriodKey
  );
}
