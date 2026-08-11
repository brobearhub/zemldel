type StageAttachmentsSource = {
  readonly files: readonly unknown[];
  readonly docSlots: readonly unknown[];
};

type StageExpandableSource = StageAttachmentsSource & {
  readonly description: string;
};

/** Why: customer UI скрывает блок файлов этапа, если нечего показывать. */
export function hasStageAttachments(stage: StageAttachmentsSource): boolean {
  return stage.files.length > 0 || stage.docSlots.length > 0;
}

/** Why: пустой этап у customer не раскрываем — нечего показать. */
export function hasStageExpandableContent(stage: StageExpandableSource): boolean {
  return stage.description.trim().length > 0 || hasStageAttachments(stage);
}
