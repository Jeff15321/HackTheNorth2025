export const scriptStore = {
  scriptData: "",
  shouldAnimateScriptData: true,
};

export function setScriptDataValue(value: string) {
  scriptStore.scriptData = value;
}

export function setShouldAnimateScriptData(value: boolean) {
  scriptStore.shouldAnimateScriptData = value;
}


