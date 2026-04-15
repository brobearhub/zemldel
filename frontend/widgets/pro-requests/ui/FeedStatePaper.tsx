import { Paper, Typography } from "@mui/material";

type Props = {
  title: string;
  description: string;
  padding?: number;
};

export function FeedStatePaper({ title, description, padding = 3 }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: padding }}>
      <Typography fontWeight={800} gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Paper>
  );
}

