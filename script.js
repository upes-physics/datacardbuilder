const form = document.querySelector("#course-form");
const dialog = document.querySelector("#preview-dialog");
const preview = document.querySelector("#json-preview");
const toast = document.querySelector("#toast");
const supportingFilesInput = document.querySelector("#supporting-files");
const supportingFileList = document.querySelector("#supporting-file-list");
let supportingFiles = [];

const resourceFields = [
  { key: "name", label: "Name", placeholder: "e.g. Circuit simulator" },
  { key: "desc", label: "Description", type: "textarea", placeholder: "Briefly describe this resource" },
  { key: "link", label: "Link", placeholder: "https://example.com or simulator.html" },
  { key: "file", label: "Upload HTML file (optional)", type: "file" },
];

function addResource(values = {}) {
  const container = document.querySelector('[data-section="simulators"] .items');
  const item = document.createElement("div");
  item.className = "item resource-item";
  item.innerHTML = `<div class="item-title">Resource ${container.children.length + 1}</div><button type="button" class="remove" aria-label="Remove resource">×</button>`;

  resourceFields.forEach((field) => {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    input.dataset.key = field.key;
    if (field.type === "file") {
      label.className = "file-field";
      input.type = "file";
      input.accept = ".html,.htm,text/html";
      if (values.fileName) {
        const note = document.createElement("small");
        note.textContent = `Previously selected: ${values.fileName}. Select it again to include it in the ZIP.`;
        label.append(note);
      } else {
        const note = document.createElement("small");
        note.textContent = "Only needed when you want to include the HTML file in the ZIP.";
        label.append(note);
      }
    } else {
      input.type = field.type || "text";
      input.placeholder = field.placeholder || "";
      input.value = values[field.key] ?? "";
      if (field.key === "link") {
        const note = document.createElement("small");
        note.textContent = "Enter an HTTPS URL or an HTML filename.";
        label.append(note);
      }
    }
    label.append(input);
    item.append(label);
  });

  container.append(item);
}

function renumberResources() {
  document.querySelectorAll(".resource-item .item-title").forEach((title, index) => {
    title.textContent = `Resource ${index + 1}`;
  });
}

function buildDatacard() {
  const resources = [...document.querySelectorAll(".resource-item")].map((item) => {
    const input = (key) => item.querySelector(`[data-key="${key}"]`);
    const file = input("file").files[0];
    return {
      name: input("name").value.trim(),
      desc: input("desc").value.trim(),
      link: input("link").value.trim(),
      uploadFileLink: file?.name || "",
    };
  });
  return {
    courseCode: form.elements.courseCode.value.trim(),
    courseName: form.elements.courseName.value.trim(),
    faculty: {
      name: "",
      email: "",
    },
    simulators: resources,
  };
}

function save() {
  localStorage.setItem("datacard-builder", JSON.stringify(buildDatacard()));
}

// Build a standards-compliant, uncompressed ZIP so the app remains dependency-free.
const encoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipPart(signature, size) {
  const bytes = new Uint8Array(size);
  new DataView(bytes.buffer).setUint32(0, signature, true);
  return { bytes, view: new DataView(bytes.buffer) };
}

async function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(await file.data.arrayBuffer());
    const checksum = crc32(data);
    const local = zipPart(0x04034b50, 30 + name.length);
    local.view.setUint16(4, 20, true);
    local.view.setUint32(14, checksum, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, name.length, true);
    local.bytes.set(name, 30);
    localParts.push(local.bytes, data);

    const central = zipPart(0x02014b50, 46 + name.length);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint32(16, checksum, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, data.length, true);
    central.view.setUint16(28, name.length, true);
    central.view.setUint32(42, offset, true);
    central.bytes.set(name, 46);
    centralParts.push(central.bytes);
    offset += local.bytes.length + data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = zipPart(0x06054b50, 22);
  end.view.setUint16(8, files.length, true);
  end.view.setUint16(10, files.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end.bytes], { type: "application/zip" });
}

document.querySelector("[data-add]").addEventListener("click", () => {
  addResource();
  save();
});
document.querySelector('[data-section="simulators"] .items').addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove");
  if (!removeButton) return;
  removeButton.closest(".resource-item").remove();
  renumberResources();
  save();
});
form.addEventListener("input", save);
function validateResourceLinks() {
  let valid = true;
  document.querySelectorAll('[data-key="link"]').forEach((input) => {
    const link = input.value.trim();
    const isHttpsUrl = link.startsWith("https://") && (() => {
      try {
        return new URL(link).protocol === "https:";
      } catch {
        return false;
      }
    })();
    const isHtmlFilename = /^[^/\\]+\.html?$/i.test(link);
    input.setCustomValidity(link && !isHttpsUrl && !isHtmlFilename ? "Enter an HTTPS URL or an HTML filename such as simulator.html." : "");
    if (!input.checkValidity()) valid = false;
  });
  return valid;
}
form.addEventListener("input", (event) => {
  if (event.target.matches('[data-key="link"]')) validateResourceLinks();
});
function renderSupportingFiles() {
  supportingFileList.replaceChildren(
    ...supportingFiles.map((file, index) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-supporting-file";
      remove.dataset.index = index;
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      item.append(name, remove);
      return item;
    }),
  );
}
supportingFilesInput.addEventListener("change", () => {
  supportingFiles.push(...supportingFilesInput.files);
  supportingFilesInput.value = "";
  renderSupportingFiles();
});
supportingFileList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-supporting-file");
  if (!removeButton) return;
  supportingFiles.splice(Number(removeButton.dataset.index), 1);
  renderSupportingFiles();
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  validateResourceLinks();
  if (!form.reportValidity()) return;

  const datacard = buildDatacard();
  const files = [];
  const usedNames = new Set(["datacard.json"]);
  document.querySelectorAll('[data-key="file"]').forEach((input, index) => {
    const file = input.files[0];
    if (!file) return;
    let name = file.name.replace(/[\\/]/g, "_");
    let suffix = 2;
    while (usedNames.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      name = `${base}-${suffix}${ext}`;
      suffix += 1;
    }
    usedNames.add(name);
    datacard.simulators[index].uploadFileLink = name;
    files.push({ name, data: file });
  });
  supportingFiles.forEach((file) => {
    let name = file.name.replace(/[\\/]/g, "_");
    let suffix = 2;
    while (usedNames.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      name = `${base}-${suffix}${ext}`;
      suffix += 1;
    }
    usedNames.add(name);
    files.push({ name, data: file });
  });
  files.unshift({ name: "datacard.json", data: encoder.encode(JSON.stringify(datacard, null, 2)) });
  const zip = await createZip(files);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zip);
  link.download = `${datacard.courseCode}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});

document.querySelector("#preview-button").addEventListener("click", () => {
  preview.textContent = JSON.stringify(buildDatacard(), null, 2);
  dialog.showModal();
});
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#copy-json").addEventListener("click", async () => {
  await navigator.clipboard.writeText(preview.textContent);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
});

const saved = JSON.parse(localStorage.getItem("datacard-builder") || "null");
if (saved) {
  form.elements.courseCode.value = saved.courseCode || "";
  form.elements.courseName.value = saved.courseName || "";
  document.querySelector('[data-section="simulators"] .items').replaceChildren();
  (saved.simulators || []).forEach((resource) => addResource({ ...resource, fileName: resource.uploadFileLink }));
}
if (!document.querySelector(".resource-item")) addResource();
