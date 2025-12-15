export type UltrasoundType =
  | "abdominal"
  | "liver"
  | "small_large_bowel"
  | "limited"
  | "neonate_spine"
  | "neonate_brain"
  | "neck"
  | "thyroid"
  | "female_pelvis"
  | "adrenal_kidney_bladder"
  | "ihps";

export const ULTRASOUND_TYPES: Array<{ value: UltrasoundType; label: string }> = [
  { value: "abdominal", label: "복부초음파" },
  { value: "liver", label: "간초음파" },
  { value: "small_large_bowel", label: "소장-대장 초음파" },
  { value: "limited", label: "단순초음파" },
  { value: "neonate_spine", label: "신생아 척수초음파" },
  { value: "neonate_brain", label: "신생아 뇌초음파" },
  { value: "neck", label: "경부 초음파" },
  { value: "thyroid", label: "갑상선 초음파" },
  { value: "female_pelvis", label: "여성 생식기 (난소, 자궁) 초음파" },
  { value: "adrenal_kidney_bladder", label: "부신-신장-방광 초음파" },
  { value: "ihps", label: "IHPS 초음파" }
];

type AbnormalTile = { id: string; title: string; text: string };

const normalFindingsByType: Record<UltrasoundType, string> = {
  abdominal:
    "Liver normal in size and echogenicity without focal lesion. Gallbladder unremarkable; no stone or wall thickening. Intra/extrahepatic bile ducts not dilated. Pancreas and spleen unremarkable. Both kidneys normal in size without hydronephrosis. Urinary bladder unremarkable. No ascites.",
  liver:
    "Liver normal in size and echogenicity without focal lesion. Portal/hepatic veins patent. Gallbladder unremarkable. Intra/extrahepatic bile ducts not dilated. No perihepatic fluid.",
  small_large_bowel:
    "No abnormal bowel wall thickening. No pathologic hyperemia. No intussusception identified. Appendix not visualized or appears within normal limits when seen. No free fluid. No significant mesenteric lymphadenopathy.",
  limited:
    "Targeted ultrasound of the requested area demonstrates no focal fluid collection or discrete mass. No abnormal hyperemia. Findings are within expected limits for the limited exam.",
  neonate_spine:
    "Conus medullaris terminates at an appropriate level. Filum terminale not thickened. Central canal not dilated. No intraspinal mass or dermal sinus tract. No evidence of tethering on this exam.",
  neonate_brain:
    "Ventricular size within normal limits. No germinal matrix/intraventricular hemorrhage. No periventricular echogenicity to suggest leukomalacia. Midline structures are intact. No extra-axial fluid collection.",
  neck:
    "No suspicious cervical mass. Thyroid bed and major salivary glands appear unremarkable on this limited neck assessment. No pathologic lymphadenopathy. No focal fluid collection.",
  thyroid:
    "Thyroid gland normal in size and echotexture. No discrete thyroid nodule. No suspicious cervical lymphadenopathy.",
  female_pelvis:
    "Uterus and ovaries demonstrate age-appropriate appearance. No adnexal mass. No sonographic evidence of torsion. No free pelvic fluid.",
  adrenal_kidney_bladder:
    "Adrenal glands without focal mass. Both kidneys normal in size without hydronephrosis. No focal renal lesion. Urinary bladder unremarkable without wall thickening or debris.",
  ihps:
    "Pylorus without abnormal muscle thickening or elongation. Gastric contents pass through the pyloric channel during the exam. No secondary signs of gastric outlet obstruction."
};

const defaultImpressionByType: Record<UltrasoundType, string> = {
  abdominal: "Unremarkable abdominal ultrasound.",
  liver: "Unremarkable liver ultrasound.",
  small_large_bowel: "No sonographic evidence of acute inflammatory bowel process on this exam.",
  limited: "No focal abnormality identified on this limited ultrasound exam.",
  neonate_spine: "No sonographic evidence of spinal dysraphism or tethered cord on this exam.",
  neonate_brain: "No sonographic evidence of intracranial hemorrhage or ventriculomegaly on this exam.",
  neck: "No focal neck abnormality identified on this exam.",
  thyroid: "Unremarkable thyroid ultrasound.",
  female_pelvis: "Unremarkable pelvic ultrasound.",
  adrenal_kidney_bladder: "Unremarkable adrenal, renal, and bladder ultrasound.",
  ihps: "No sonographic evidence of hypertrophic pyloric stenosis."
};

const abnormalTilesByType: Record<UltrasoundType, AbnormalTile[]> = {
  abdominal: [
    { id: "hepatomegaly", title: "Hepatomegaly", text: "Liver appears enlarged for age." },
    { id: "fatty_liver", title: "Increased echogenicity", text: "Diffuse increased hepatic echogenicity." },
    { id: "gb_sludge", title: "Gallbladder sludge", text: "Echogenic sludge is noted in the gallbladder." },
    { id: "bile_duct_dilation", title: "Bile duct dilatation", text: "Bile ducts appear dilated." },
    { id: "hydronephrosis", title: "Hydronephrosis", text: "Hydronephrosis is present." },
    { id: "free_fluid", title: "Free fluid", text: "Small amount of free intraperitoneal fluid is noted." },
    { id: "splenomegaly", title: "Splenomegaly", text: "Spleen appears enlarged for age." }
  ],
  liver: [
    { id: "hepatomegaly", title: "Hepatomegaly", text: "Liver appears enlarged for age." },
    { id: "steatosis", title: "Increased echogenicity", text: "Diffuse increased hepatic echogenicity." },
    { id: "focal_lesion", title: "Focal lesion", text: "A focal hepatic lesion is identified; further characterization is recommended." },
    { id: "periportal", title: "Periportal echogenicity", text: "Increased periportal echogenicity is noted." },
    { id: "gb_wall", title: "GB wall thickening", text: "Gallbladder wall appears thickened." },
    { id: "bile_duct_dilation", title: "Bile duct dilatation", text: "Bile ducts appear dilated." },
    { id: "perihepatic_fluid", title: "Perihepatic fluid", text: "Perihepatic free fluid is present." }
  ],
  small_large_bowel: [
    { id: "wall_thick", title: "Wall thickening", text: "Segmental bowel wall thickening is noted." },
    { id: "hyperemia", title: "Hyperemia", text: "Increased mural vascularity is present on Doppler." },
    { id: "intussusception", title: "Intussusception", text: "Findings are compatible with intussusception." },
    { id: "appendicitis", title: "Appendicitis", text: "Findings are suspicious for acute appendicitis." },
    { id: "nodes", title: "Mesenteric nodes", text: "Prominent mesenteric lymph nodes are noted." },
    { id: "free_fluid", title: "Free fluid", text: "Free fluid is present." },
    { id: "dilated_loops", title: "Dilated loops", text: "Fluid-filled dilated bowel loops are noted." }
  ],
  limited: [
    { id: "fluid", title: "Fluid collection", text: "A focal fluid collection is identified." },
    { id: "abscess", title: "Abscess", text: "Complex fluid collection is suspicious for abscess." },
    { id: "mass", title: "Mass", text: "A discrete solid mass is identified." },
    { id: "hematoma", title: "Hematoma", text: "Findings may represent hematoma." },
    { id: "foreign_body", title: "Foreign body", text: "Echogenic focus with shadowing suggests a foreign body." },
    { id: "hyperemia", title: "Hyperemia", text: "Increased vascularity is present on Doppler." },
    { id: "edema", title: "Edema", text: "Diffuse soft tissue edema is present." }
  ],
  neonate_spine: [
    { id: "low_conus", title: "Low conus", text: "Conus medullaris terminates lower than expected." },
    { id: "thick_filum", title: "Thickened filum", text: "Filum terminale appears thickened." },
    { id: "syrinx", title: "Central canal dilation", text: "Central canal dilation is noted." },
    { id: "mass", title: "Intraspinal mass", text: "An intraspinal mass is identified." },
    { id: "dermal_sinus", title: "Dermal sinus", text: "Findings suggest a dermal sinus tract." },
    { id: "lipoma", title: "Lipoma", text: "Echogenic lesion suggests a spinal lipoma." },
    { id: "tether", title: "Tethering", text: "Findings raise concern for tethered cord." }
  ],
  neonate_brain: [
    { id: "ivh", title: "IVH", text: "Germinal matrix/intraventricular hemorrhage is present." },
    { id: "ventriculomegaly", title: "Ventriculomegaly", text: "Ventricular dilatation is present." },
    { id: "pvlsus", title: "PVL", text: "Periventricular echogenicity is suspicious for leukomalacia." },
    { id: "cyst", title: "Cyst", text: "A cystic lesion is identified." },
    { id: "extra_axial", title: "Extra-axial fluid", text: "Extra-axial fluid collection is present." },
    { id: "midline", title: "Midline abnormality", text: "Midline abnormality is suspected; consider MRI if clinically indicated." },
    { id: "calc", title: "Calcifications", text: "Intracranial calcifications are noted." }
  ],
  neck: [
    { id: "reactive_nodes", title: "Reactive nodes", text: "Multiple benign-appearing reactive lymph nodes are noted." },
    { id: "necrotic_node", title: "Necrotic node", text: "A lymph node with central necrosis is identified." },
    { id: "abscess", title: "Abscess", text: "Complex fluid collection is suspicious for abscess." },
    { id: "sialadenitis", title: "Sialadenitis", text: "Enlarged salivary gland with increased vascularity suggests sialadenitis." },
    { id: "thyroglossal", title: "Thyroglossal duct cyst", text: "Findings are compatible with a thyroglossal duct cyst." },
    { id: "branchial", title: "Branchial cleft cyst", text: "Findings are compatible with a branchial cleft cyst." },
    { id: "mass", title: "Mass", text: "A solid neck mass is identified." }
  ],
  thyroid: [
    { id: "nodule", title: "Thyroid nodule", text: "A thyroid nodule is identified." },
    { id: "thyromegaly", title: "Thyromegaly", text: "Thyroid gland appears enlarged." },
    { id: "thyroiditis", title: "Thyroiditis", text: "Heterogeneous echotexture with increased vascularity suggests thyroiditis." },
    { id: "cyst", title: "Cyst", text: "A simple cyst is identified in the thyroid." },
    { id: "microcalc", title: "Microcalcifications", text: "Microcalcifications are present within a thyroid lesion." },
    { id: "suspicious_nodes", title: "Suspicious nodes", text: "Suspicious cervical lymph nodes are present." },
    { id: "increased_vasc", title: "Increased vascularity", text: "Increased thyroid vascularity is present on Doppler." }
  ],
  female_pelvis: [
    { id: "cyst", title: "Ovarian cyst", text: "An ovarian cyst is identified." },
    { id: "torsion", title: "Torsion", text: "Findings are concerning for ovarian torsion." },
    { id: "mass", title: "Adnexal mass", text: "An adnexal mass is identified." },
    { id: "hemorrhagic", title: "Hemorrhagic cyst", text: "Complex ovarian cyst suggests hemorrhagic cyst." },
    { id: "free_fluid", title: "Free fluid", text: "Free pelvic fluid is present." },
    { id: "uterine", title: "Uterine abnormality", text: "Uterus demonstrates an abnormal appearance; correlate clinically." },
    { id: "pyo", title: "Inflammation", text: "Findings suggest pelvic inflammatory process; correlate clinically." }
  ],
  adrenal_kidney_bladder: [
    { id: "hydronephrosis", title: "Hydronephrosis", text: "Hydronephrosis is present." },
    { id: "pelviectasis", title: "Pelviectasis", text: "Mild renal pelvic dilatation is noted." },
    { id: "ureterocele", title: "Ureterocele", text: "Findings are compatible with ureterocele." },
    { id: "stones", title: "Urolithiasis", text: "Echogenic focus with shadowing suggests urinary calculus." },
    { id: "cystitis", title: "Cystitis", text: "Bladder wall thickening suggests cystitis; correlate with urinalysis." },
    { id: "debris", title: "Bladder debris", text: "Internal bladder debris is present." },
    { id: "adrenal_heme", title: "Adrenal hemorrhage", text: "Adrenal enlargement/heterogeneity suggests hemorrhage." }
  ],
  ihps: [
    { id: "thick", title: "Muscle thickening", text: "Pyloric muscle thickness is increased." },
    { id: "elong", title: "Elongated canal", text: "Pyloric channel length appears increased." },
    { id: "no_pass", title: "No passage", text: "No passage of gastric contents through the pylorus is observed." },
    { id: "shoulder", title: "Shoulder sign", text: "Shoulder sign is present." },
    { id: "antrum", title: "Antral nipple", text: "Antral nipple sign is present." },
    { id: "distension", title: "Gastric distension", text: "Stomach is distended with retained contents." },
    { id: "other", title: "Other cause", text: "Consider alternate causes of vomiting if measurements are equivocal." }
  ]
};

export function getNormalFindings(type: UltrasoundType | ""): string {
  if (!type) return "";
  return normalFindingsByType[type];
}

export function getDefaultImpression(type: UltrasoundType | ""): string {
  if (!type) return "";
  return defaultImpressionByType[type];
}

export function getAbnormalTiles(type: UltrasoundType | ""): AbnormalTile[] {
  if (!type) return [];
  return abnormalTilesByType[type];
}

