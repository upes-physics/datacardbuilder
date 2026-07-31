const form = document.querySelector("#course-form");
const dialog = document.querySelector("#preview-dialog");
const preview = document.querySelector("#json-preview");
const toast = document.querySelector("#toast");

const definitions = {
  objectives: [{ key: "value", label: "Objective", type: "textarea", placeholder: "Describe a course objective…" }],
  outcomes: [
    { key: "code", label: "Outcome code", placeholder: "e.g. CO1" },
    { key: "statement", label: "Statement", type: "textarea", placeholder: "What will students be able to do?" },
  ],
  syllabus: [
    { key: "title", label: "Module title", placeholder: "e.g. Programming with Python" },
    { key: "lectureHours", label: "Lecture hours", type: "number", placeholder: "0" },
    { key: "topics", label: "Topics", type: "textarea", placeholder: "List the topics covered…" },
  ],
  simulators: [
    { key: "name", label: "Resource name", placeholder: "e.g. Python" },
    { key: "desc", label: "Description", placeholder: "Briefly describe this resource" },
    { key: "link", label: "Link", placeholder: "https://…" },
  ],
  lectureNotes: [
    { key: "title", label: "Note title", placeholder: "e.g. Week 1 notes" },
    { key: "link", label: "Link", placeholder: "https://…" },
  ],
};

function addItem(section, values = {}) {
  const container = document.querySelector(`[data-section="${section}"] .items`);
  const item = document.createElement("div");
  const fields = definitions[section];
  item.className = `item ${fields.length === 2 ? "two" : fields.length === 3 ? "three" : ""}`;
  item.innerHTML = `<div class="item-title">${section === "syllabus" ? "Module" : section.slice(0, -1) || "item"} ${container.children.length + 1}</div><button type="button" class="remove" aria-label="Remove item">×</button>`;
  fields.forEach((field) => {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    input.dataset.key = field.key;
    input.placeholder = field.placeholder || "";
    if (field.type === "number") { input.type = "number"; input.min = "0"; }
    input.value = values[field.key] ?? "";
    label.append(input); item.append(label);
  });
  item.querySelector(".remove").addEventListener("click", () => { item.remove(); renumber(container); save(); });
  container.append(item);
}

function renumber(container) {
  [...container.children].forEach((item, index) => { item.querySelector(".item-title").textContent = item.querySelector(".item-title").textContent.replace(/\d+$/, index + 1); });
}

function buildJSON() {
  const value = (name) => form.elements[name]?.value.trim() || "";
  const result = {
    courseCode: value("courseCode"), courseName: value("courseName"),
    credits: { L: Number(value("credits.L")), T: Number(value("credits.T")), P: Number(value("credits.P")), C: Number(value("credits.C")) },
  };
  Object.keys(definitions).forEach((section) => {
    result[section] = [...document.querySelectorAll(`[data-section="${section}"] .item`)].map((item) => {
      const entry = {};
      item.querySelectorAll("[data-key]").forEach((input) => { entry[input.dataset.key] = input.type === "number" ? Number(input.value) : input.value.trim(); });
      return section === "objectives" ? entry.value : entry;
    });
  });
  result.faculty = { name: value("faculty.name"), email: value("faculty.email") };
  return result;
}

function save() { localStorage.setItem("course-json-builder", JSON.stringify(buildJSON())); }
document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", () => { addItem(button.dataset.add); save(); }));
form.addEventListener("input", save);
form.addEventListener("submit", (event) => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const blob = new Blob([JSON.stringify(buildJSON(), null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${form.elements.courseCode.value.trim() || "course"}.json`; link.click(); URL.revokeObjectURL(link.href);
});
document.querySelector("#preview-button").addEventListener("click", () => { preview.textContent = JSON.stringify(buildJSON(), null, 2); dialog.showModal(); });
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#copy-json").addEventListener("click", async () => { await navigator.clipboard.writeText(preview.textContent); toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800); });

const saved = JSON.parse(localStorage.getItem("course-json-builder") || "null");
if (saved) {
  ["courseCode", "courseName"].forEach((key) => { form.elements[key].value = saved[key] || ""; });
  Object.entries(saved.credits || {}).forEach(([key, val]) => { form.elements[`credits.${key}`].value = val; });
  Object.keys(definitions).forEach((section) => (saved[section] || []).forEach((entry) => addItem(section, section === "objectives" ? { value: entry } : entry)));
  Object.entries(saved.faculty || {}).forEach(([key, val]) => { form.elements[`faculty.${key}`].value = val; });
} else { addItem("objectives"); addItem("outcomes"); addItem("syllabus"); }
