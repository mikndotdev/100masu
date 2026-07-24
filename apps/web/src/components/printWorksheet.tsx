"use client";

import {
  Document,
  Page,
  PDFDownloadLink,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  computeCell,
  formatAnswer,
  OPERATION_LABEL,
  OPERATION_SYMBOL,
  type Board,
  type Operation,
} from "@/lib/game";

type PrintWorksheetProps = {
  board: Board;
  op: Operation;
  range: string;
  withAnswers: boolean;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
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
  headerText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  answerText: { fontSize: 11 },
});

function WorksheetDocument({ board, op, range, withAnswers }: PrintWorksheetProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>100-masu · {OPERATION_LABEL[op]}</Text>
        <Text style={styles.subtitle}>
          Numbers {range}
          {withAnswers ? " · Answer key" : ""}
        </Text>
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
                const text = withAnswers && result !== null ? formatAnswer(result) : "";
                return (
                  <View key={col} style={styles.cell}>
                    <Text style={styles.answerText}>{text}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default function PrintWorksheet({ board, op, range, withAnswers }: PrintWorksheetProps) {
  const document = (
    <WorksheetDocument board={board} op={op} range={range} withAnswers={withAnswers} />
  );

  return (
    <div className="flex flex-col gap-4">
      <PDFDownloadLink
        document={document}
        fileName={`100masu-${op}${withAnswers ? "-answers" : ""}.pdf`}
        className="btn btn-primary w-fit"
      >
        {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
      </PDFDownloadLink>
      <PDFViewer showToolbar className="h-[80vh] w-full rounded-box border border-base-300">
        {document}
      </PDFViewer>
    </div>
  );
}
