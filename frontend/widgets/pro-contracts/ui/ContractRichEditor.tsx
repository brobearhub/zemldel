"use client";

import { useEffect, useMemo, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

export type ContractEditorContent = {
  format: "tiptap";
  version: 1;
  document: JSONContent;
};

export type ContractBlockOption = {
  id: string;
  title: string;
  category: string | null;
  content: unknown;
};

type Props = {
  value: unknown;
  editable?: boolean;
  commentable?: boolean;
  variableSnapshot?: unknown;
  blocks?: ContractBlockOption[];
  onChange?: (content: ContractEditorContent) => void;
  onCreateComment?: (input: { anchor: Record<string, unknown>; quote: string; body: string }) => Promise<void> | void;
};

const variables = [
  { label: "Провайдер", key: "provider.name", value: "{{provider.name}}" },
  { label: "Юр. название", key: "provider.legal.legalName", value: "{{provider.legal.legalName}}" },
  { label: "ИНН провайдера", key: "provider.legal.inn", value: "{{provider.legal.inn}}" },
  { label: "Клиент", key: "customer.name", value: "{{customer.name}}" },
  { label: "ИНН клиента", key: "customer.legal.inn", value: "{{customer.legal.inn}}" },
  { label: "Цена", key: "request.dealTerms.price", value: "{{request.dealTerms.price}}" },
  { label: "Адрес работ", key: "request.location", value: "{{request.location}}" },
];

const printableBlocks: Array<{ id: string; title: string; content: JSONContent[] }> = [
  {
    id: "parties",
    title: "Стороны договора",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Стороны договора" }] },
      {
        type: "paragraph",
        content: [
          { type: "contractVariable", attrs: { key: "provider.name", label: "Провайдер" } },
          { type: "text", text: ", именуемый в дальнейшем «Исполнитель», и " },
          { type: "contractVariable", attrs: { key: "customer.name", label: "Клиент" } },
          { type: "text", text: ", именуемый в дальнейшем «Заказчик», заключили настоящий договор." },
        ],
      },
    ],
  },
  {
    id: "subject",
    title: "Предмет договора",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "2. Предмет договора" }] },
      { type: "paragraph", content: [{ type: "text", text: "Исполнитель обязуется оказать услуги по заявке Заказчика, а Заказчик обязуется принять и оплатить оказанные услуги." }] },
    ],
  },
  {
    id: "payment",
    title: "Оплата",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "3. Стоимость и порядок оплаты" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Стоимость услуг составляет " },
          { type: "contractVariable", attrs: { key: "request.dealTerms.price", label: "Цена" } },
          { type: "text", text: " рублей." },
        ],
      },
    ],
  },
  {
    id: "requisites",
    title: "Реквизиты и подписи",
    content: [
      { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Реквизиты и подписи сторон" }] },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Исполнитель" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Заказчик" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "contractVariable", attrs: { key: "provider.legal.legalName", label: "Юр. название" } }] }],
              },
              {
                type: "tableCell",
                content: [{ type: "paragraph", content: [{ type: "contractVariable", attrs: { key: "customer.name", label: "Клиент" } }] }],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Подпись: __________________" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Подпись: __________________" }] }] },
            ],
          },
        ],
      },
    ],
  },
];

const ContractVariable = Node.create({
  name: "contractVariable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      key: { default: "" },
      label: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-contract-variable]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const label = String(HTMLAttributes.label || HTMLAttributes.key || "Переменная");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-contract-variable": HTMLAttributes.key,
        contenteditable: "false",
        class: "contract-variable",
      }),
      label,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.key}}}`;
  },
});

function markdownToDocument(markdown: string): JSONContent {
  const lines = markdown.split(/\n{2,}/).map((line) => line.trim()).filter(Boolean);
  return {
    type: "doc",
    content: lines.length
      ? lines.map((line) => {
          if (line.startsWith("## ")) {
            return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: line.slice(3) }] };
          }
          if (line.startsWith("# ")) {
            return { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: line.slice(2) }] };
          }
          return { type: "paragraph", content: [{ type: "text", text: line }] };
        })
      : [{ type: "paragraph" }],
  };
}

export function normalizeContractEditorContent(value: unknown): ContractEditorContent {
  if (value && typeof value === "object") {
    const obj = value as { format?: unknown; document?: unknown; markdown?: unknown };
    if (obj.format === "tiptap" && obj.document && typeof obj.document === "object") {
      return { format: "tiptap", version: 1, document: obj.document as JSONContent };
    }
    if (obj.format === "markdown" && typeof obj.markdown === "string") {
      return { format: "tiptap", version: 1, document: markdownToDocument(obj.markdown) };
    }
  }
  return { format: "tiptap", version: 1, document: { type: "doc", content: [{ type: "paragraph" }] } };
}

function extractBlockDocument(content: unknown): JSONContent | null {
  if (!content || typeof content !== "object") return null;
  const obj = content as { format?: unknown; document?: unknown; markdown?: unknown };
  if (obj.format === "tiptap" && obj.document && typeof obj.document === "object") return obj.document as JSONContent;
  if (obj.format === "markdown" && typeof obj.markdown === "string") return markdownToDocument(obj.markdown);
  return null;
}

export function ContractRichEditor({
  value,
  editable = true,
  commentable = false,
  variableSnapshot,
  blocks = [],
  onChange,
  onCreateComment,
}: Props) {
  const initialContent = useMemo(() => normalizeContractEditorContent(value), [value]);
  const [commentBody, setCommentBody] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Начните писать договор..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ContractVariable,
    ],
    content: initialContent.document,
    onUpdate: ({ editor }) => {
      onChange?.({ format: "tiptap", version: 1, document: editor.getJSON() });
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;
  const activeEditor = editor;

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const quote = activeEditor.state.doc.textBetween(activeEditor.state.selection.from, activeEditor.state.selection.to, " ").trim();

  function insertVariable(variable: (typeof variables)[number]) {
    activeEditor.chain().focus().insertContent({ type: "contractVariable", attrs: { key: variable.key, label: variable.label } }).run();
  }

  function insertSelectedBlock() {
    if (!selectedBlock) return;
    const doc = extractBlockDocument(selectedBlock.content);
    if (!doc?.content) return;
    activeEditor.chain().focus().insertContent(doc.content).run();
  }

  function insertPrintableBlock(id: string) {
    const block = printableBlocks.find((item) => item.id === id);
    if (!block) return;
    activeEditor.chain().focus().insertContent(block.content).run();
  }

  async function createComment() {
    const body = commentBody.trim();
    if (!body || !onCreateComment) return;
    const { from, to } = activeEditor.state.selection;
    await onCreateComment({
      anchor: { type: "prosemirror-range", from, to },
      quote,
      body,
    });
    setCommentBody("");
  }

  return (
    <Stack spacing={2}>
      {editable ? (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} useFlexGap sx={{
              flexWrap: "wrap"
            }}>
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => editor.chain().focus().setParagraph().run()}>Текст</Button>
                <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>Заголовок</Button>
                <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Подзаголовок</Button>
              </ButtonGroup>
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => editor.chain().focus().toggleBold().run()}>Жирный</Button>
                <Button onClick={() => editor.chain().focus().toggleBulletList().run()}>Список</Button>
                <Button onClick={() => editor.chain().focus().setHorizontalRule().run()}>Разделитель</Button>
              </ButtonGroup>
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => editor.chain().focus().setTextAlign("left").run()}>Слева</Button>
                <Button onClick={() => editor.chain().focus().setTextAlign("center").run()}>По центру</Button>
                <Button onClick={() => editor.chain().focus().setTextAlign("right").run()}>Справа</Button>
              </ButtonGroup>
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>Таблица</Button>
                <Button disabled={!editor.can().deleteTable()} onClick={() => editor.chain().focus().deleteTable().run()}>Удалить таблицу</Button>
                <Button disabled={!editor.can().addRowAfter()} onClick={() => editor.chain().focus().addRowAfter().run()}>+ строка</Button>
                <Button disabled={!editor.can().addColumnAfter()} onClick={() => editor.chain().focus().addColumnAfter().run()}>+ колонка</Button>
              </ButtonGroup>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField select label="Переменная" size="small" defaultValue="" sx={{ minWidth: 220 }}>
                <MenuItem value="">Выберите переменную</MenuItem>
                {variables.map((variable) => (
                  <MenuItem key={variable.value} value={variable.value} onClick={() => insertVariable(variable)}>
                    {variable.label} · {variable.value}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Печатный блок" size="small" defaultValue="" sx={{ minWidth: 240 }}>
                <MenuItem value="">Выберите блок</MenuItem>
                {printableBlocks.map((block) => (
                  <MenuItem key={block.id} value={block.id} onClick={() => insertPrintableBlock(block.id)}>
                    {block.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Блок договора"
                size="small"
                value={selectedBlockId}
                onChange={(event) => setSelectedBlockId(event.target.value)}
                sx={{ minWidth: 260 }}
              >
                <MenuItem value="">Выберите блок</MenuItem>
                {blocks.map((block) => (
                  <MenuItem key={block.id} value={block.id}>
                    {block.category ? `${block.category} · ` : ""}
                    {block.title}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" disabled={!selectedBlock} onClick={insertSelectedBlock}>
                Вставить блок
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}

      <Paper
        variant="outlined"
        sx={{
          bgcolor: "grey.100",
          p: { xs: 1, md: 2.5 },
          overflowX: "auto",
          "@media print": {
            bgcolor: "transparent",
            border: 0,
            boxShadow: "none",
            p: 0,
          },
          "& .contract-page": {
            width: "210mm",
            minHeight: editable ? "297mm" : "auto",
            mx: "auto",
            bgcolor: "background.paper",
            boxShadow: editable ? 2 : 0,
            p: "20mm",
            color: "text.primary",
            "@media print": {
              width: "auto",
              minHeight: "auto",
              boxShadow: "none",
              p: 0,
            },
          },
          "& .ProseMirror": { minHeight: editable ? "240mm" : "auto", outline: "none", fontSize: "14px", lineHeight: 1.55 },
          "& .ProseMirror h1": { fontSize: "2rem" },
          "& .ProseMirror h2": { fontSize: "1.5rem" },
          "& .ProseMirror table": { borderCollapse: "collapse", width: "100%", my: 2 },
          "& .ProseMirror td, & .ProseMirror th": { border: "1px solid", borderColor: "divider", p: 1, verticalAlign: "top" },
          "& .ProseMirror th": { bgcolor: "grey.100", fontWeight: 800 },
          "& .contract-variable": {
            display: "inline-block",
            px: 0.75,
            mx: 0.25,
            borderRadius: 1,
            bgcolor: "primary.50",
            color: "primary.dark",
            border: "1px solid",
            borderColor: "primary.light",
            fontWeight: 700,
            whiteSpace: "nowrap",
          },
        }}
      >
        <Box className="contract-page">
          <EditorContent editor={activeEditor} />
        </Box>
      </Paper>

      {commentable ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography sx={{
                fontWeight: 800
              }}>Комментарий к выделению</Typography>
              {quote ? <Chip size="small" label={`"${quote.slice(0, 60)}${quote.length > 60 ? "..." : ""}"`} /> : null}
            </Stack>
            <TextField
              label="Комментарий"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              minRows={2}
              multiline
              helperText={quote ? "Комментарий будет привязан к выделенному фрагменту." : "Можно оставить общий комментарий или сначала выделить текст."}
            />
            <Button variant="outlined" disabled={commentBody.trim().length < 3} onClick={() => void createComment()}>
              Добавить комментарий
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {variableSnapshot ? (
        <>
          <Divider />
          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              Значения реквизитов зафиксированы в договоре при создании экземпляра.
            </Typography>
          </Box>
        </>
      ) : null}
    </Stack>
  );
}
