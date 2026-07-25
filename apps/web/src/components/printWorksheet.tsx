"use client";

import {
  Document,
  Font,
  Image,
  Page,
  PDFDownloadLink,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { useTranslation } from "react-i18next";

import {
  computeCell,
  formatAnswer,
  OPERATION_SYMBOL,
  type Board,
  type Operation,
} from "@/lib/game";

const FONT_FAMILY = "M PLUS Rounded 1c";
const LOGO_SRC = "https://cdn.mikn.dev/branding/mikan-vtube.png";
const SITE_URL = "100masu.mikn.dev";

Font.register({
  family: FONT_FAMILY,
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mplusrounded1c/MPLUSRounded1c-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mplusrounded1c/MPLUSRounded1c-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

type PrintWorksheetProps = {
  board: Board;
  op: Operation;
  range: string;
  withAnswers: boolean;
};

type WorksheetPageProps = {
  board: Board;
  op: Operation;
  title: string;
  subtitle: string;
  showAnswers: boolean;
};

type WorksheetDocumentProps = {
  board: Board;
  op: Operation;
  title: string;
  questionSubtitle: string;
  answerSubtitle: string;
  withAnswers: boolean;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: FONT_FAMILY },
  title: { fontSize: 16, fontFamily: FONT_FAMILY, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 18 },
  row: { flexDirection: "row" },
  cell: {
    width: 46,
    height: 34,
    borderWidth: 1,
    borderColor: "#333333",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCell: { backgroundColor: "#eeeeee" },
  cornerCell: { backgroundColor: "#dddddd" },
  headerText: { fontSize: 12, fontFamily: FONT_FAMILY, fontWeight: 700 },
  answerText: { fontSize: 11 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // The source is 2000x700, so keep the 20:7 ratio to avoid stretching.
  logo: { width: 46, height: 16, objectFit: "contain" },
  footerText: { fontSize: 9, color: "#777777" },
});

function WorksheetPage({ board, op, title, subtitle, showAnswers }: WorksheetPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View>
        <View style={styles.row}>
          <View style={[styles.cell, styles.cornerCell]}>
            <Text style={styles.headerText}>{OPERATION_SYMBOL[op]}</Text>
          </View>
          {board.top.map((value, col) => (
            <View key={col} style={[styles.cell, styles.headerCell]}>
              <Text style={styles.headerText}>{value}</Text>
            </View>
          ))}
        </View>
        {board.left.map((rowValue, row) => (
          <View key={row} style={styles.row}>
            <View style={[styles.cell, styles.headerCell]}>
              <Text style={styles.headerText}>{rowValue}</Text>
            </View>
            {board.top.map((colValue, col) => {
              const result = computeCell(op, rowValue, colValue);
              const text = showAnswers && result !== null ? formatAnswer(result) : "";
              return (
                <View key={col} style={styles.cell}>
                  <Text style={styles.answerText}>{text}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer} fixed>
        <Image style={styles.logo} src={LOGO_SRC} />
        <Text style={styles.footerText}>{SITE_URL}</Text>
      </View>
    </Page>
  );
}

function WorksheetDocument({
  board,
  op,
  title,
  questionSubtitle,
  answerSubtitle,
  withAnswers,
}: WorksheetDocumentProps) {
  return (
    <Document>
      <WorksheetPage
        board={board}
        op={op}
        title={title}
        subtitle={questionSubtitle}
        showAnswers={false}
      />
      {withAnswers ? (
        <WorksheetPage board={board} op={op} title={title} subtitle={answerSubtitle} showAnswers />
      ) : null}
    </Document>
  );
}

export default function PrintWorksheet({ board, op, range, withAnswers }: PrintWorksheetProps) {
  const { t } = useTranslation();

  const title = t("print.worksheetTitle", { operation: t(`op.${op}`) });
  const questionSubtitle = t("print.worksheetNumbers", { range });
  const answerSubtitle = `${questionSubtitle}${t("print.worksheetAnswerKey")}`;

  const document = (
    <WorksheetDocument
      board={board}
      op={op}
      title={title}
      questionSubtitle={questionSubtitle}
      answerSubtitle={answerSubtitle}
      withAnswers={withAnswers}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <PDFDownloadLink
        document={document}
        fileName={`100masu-${op}${withAnswers ? "-answers" : ""}.pdf`}
        className="btn btn-primary w-fit"
      >
        {({ loading }) => (loading ? t("print.preparing") : t("print.download"))}
      </PDFDownloadLink>
      <PDFViewer showToolbar className="h-[80vh] w-full rounded-box border border-base-300">
        {document}
      </PDFViewer>
    </div>
  );
}
