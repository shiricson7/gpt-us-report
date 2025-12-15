function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function parseBirthDateFromRrn(rrn: string): { birthDate: Date; sex: "M" | "F" } | null {
  const digits = onlyDigits(rrn);
  if (digits.length < 13) return null;

  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  const s = Number(digits.slice(6, 7));

  const century =
    s === 1 || s === 2 || s === 5 || s === 6 ? 1900 : s === 3 || s === 4 || s === 7 || s === 8 ? 2000 : null;
  if (!century) return null;

  const sex: "M" | "F" = s % 2 === 1 ? "M" : "F";
  const birthDate = new Date(century + yy, mm - 1, dd);
  if (Number.isNaN(birthDate.getTime())) return null;
  return { birthDate, sex };
}

function formatAgeText(birthDate: Date, examDate: Date) {
  let months =
    (examDate.getFullYear() - birthDate.getFullYear()) * 12 + (examDate.getMonth() - birthDate.getMonth());
  if (examDate.getDate() < birthDate.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years <= 0) return `${remMonths}m`;
  if (remMonths === 0) return `${years}y`;
  return `${years}y ${remMonths}m`;
}

export function deriveAgeAndSexFromRrn(rrn: string, examDateISO: string) {
  const parsed = parseBirthDateFromRrn(rrn);
  if (!parsed) return { sex: "", ageText: "" };

  const examDate = examDateISO ? new Date(examDateISO) : new Date();
  if (Number.isNaN(examDate.getTime())) return { sex: "", ageText: "" };

  return {
    sex: parsed.sex,
    ageText: formatAgeText(parsed.birthDate, examDate)
  };
}

