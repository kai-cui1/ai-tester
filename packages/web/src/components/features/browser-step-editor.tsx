import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { baselines, type BaselineImage } from "@/lib/api";
import { useProject } from "@/lib/project-context";

/* ── Constants ── */

const BROWSER_ACTIONS = [
  "navigate", "click", "fill", "select", "check", "uncheck",
  "hover", "wait", "screenshot", "assert", "extract", "keyboard",
  "goBack", "goForward", "close",
  "setCookie", "getCookie", "deleteCookie",
  "setLocalStorage", "getLocalStorage", "setSessionStorage", "getSessionStorage", "clearStorage",
  "uploadFile", "dialog",
] as const;

const ASSERTION_TYPES = ["text", "value", "visible", "hidden", "url", "title", "attribute", "count", "screenshot", "visualDiff"] as const;
const ASSERTION_OPERATORS = ["equals", "contains", "matches", "gt", "gte", "lt", "lte"] as const;
const SCREENSHOT_PROPERTIES = ["fileExists", "width", "height", "size"] as const;
const EXTRACT_SOURCES = ["dom", "screenshot"] as const;
const OCR_LANGUAGES = ["eng", "chi_sim", "chi_sim+eng"] as const;
const WAIT_UNTIL_OPTIONS = ["load", "domcontentloaded", "networkidle"] as const;
const ELEMENT_STATES = ["visible", "hidden", "attached", "detached"] as const;
const MOUSE_BUTTONS = ["left", "right", "middle"] as const;
const COOKIE_SAMESITE_OPTIONS = ["Strict", "Lax", "None"] as const;
const STORAGE_TYPES = ["localStorage", "sessionStorage", "all"] as const;
const DIALOG_ACTIONS = ["accept", "dismiss"] as const;

/* ── Props ── */

export interface BrowserStepEditorProps {
  config: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}

/* ── Component ── */

export function BrowserStepEditor({ config, onChange }: BrowserStepEditorProps) {
  const { t } = useTranslation();
  const { current: project } = useProject();
  const [baselineList, setBaselineList] = useState<BaselineImage[]>([]);
  const action = config.action || "navigate";

  // Load baseline images for visualDiff selection
  useEffect(() => {
    if (project && config.assertion?.type === "visualDiff") {
      baselines.list(project.id).then(setBaselineList).catch(() => setBaselineList([]));
    }
  }, [project, config.assertion?.type]);

  // Which fields to show based on action
  const needsUrl = action === "navigate";
  const needsSelector = ["click", "fill", "select", "check", "uncheck", "hover", "wait", "extract", "uploadFile"].includes(action);
  const needsValue = ["fill", "select"].includes(action);
  const needsWaitUntil = action === "navigate";
  const needsClear = action === "fill";
  const needsClickOptions = action === "click";
  const needsWaitOptions = action === "wait";
  const needsScreenshotOptions = action === "screenshot";
  const needsExtractOptions = action === "extract";
  const needsAssertOptions = action === "assert";
  const needsKeyboardOptions = action === "keyboard";
  const needsCookieOptions = ["setCookie", "getCookie", "deleteCookie"].includes(action);
  const needsCookieValue = action === "setCookie";
  const needsCookieAdvanced = action === "setCookie";
  const needsStorageOptions = ["setLocalStorage", "getLocalStorage", "setSessionStorage", "getSessionStorage", "clearStorage"].includes(action);
  const needsStorageValue = ["setLocalStorage", "setSessionStorage"].includes(action);
  const needsStorageType = action === "clearStorage";
  const needsFilePath = action === "uploadFile";
  const needsDialogOptions = action === "dialog";
  const needsTimeout = !["close", "dialog"].includes(action);

  return (
    <div className="space-y-2">
      {/* Action selector */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.actionLabel")}</Label>
          <Select value={action} onValueChange={(v) => {
            // Reset config when action changes, keep only action
            const base: Record<string, any> = { action: v };
            if (v === "navigate") base.url = "";
            if (["click", "fill", "select", "check", "uncheck", "hover", "wait", "extract", "uploadFile"].includes(v)) base.selector = "";
            if (["fill", "select"].includes(v)) base.value = "";
            if (v === "assert") base.assertion = { type: "text", operator: "equals" };
            if (v === "extract") { base.selector = ""; base.variableName = ""; }
            if (v === "keyboard") base.key = "";
            if (["setCookie", "getCookie", "deleteCookie"].includes(v)) base.cookieName = "";
            if (v === "setCookie") { base.cookieValue = ""; base.cookiePath = "/"; base.cookieSameSite = "Lax"; }
            if (["getCookie", "getLocalStorage", "getSessionStorage"].includes(v)) base.variableName = "";
            if (["setLocalStorage", "getLocalStorage", "setSessionStorage", "getSessionStorage"].includes(v)) base.storageKey = "";
            if (["setLocalStorage", "setSessionStorage"].includes(v)) base.storageValue = "";
            if (v === "clearStorage") base.storageType = "all";
            if (v === "uploadFile") base.filePath = "";
            if (v === "dialog") { base.dialogAction = "accept"; }
            onChange(base);
          }}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BROWSER_ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{t(`testCases.browserConfig.action.${a}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* URL field (navigate) */}
      {needsUrl && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.urlLabel")}</Label>
          <Input
            className="h-8"
            value={config.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder={t("testCases.browserConfig.urlPlaceholder")}
          />
          <p className="text-[11px] text-muted-foreground/70">{t("testCases.browserConfig.urlHint")}</p>
        </div>
      )}

      {/* Wait Until (navigate) */}
      {needsWaitUntil && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.waitUntilLabel")}</Label>
            <Select
              value={config.waitUntil || "load"}
              onValueChange={(v) => onChange({ waitUntil: v })}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WAIT_UNTIL_OPTIONS.map((w) => (
                  <SelectItem key={w} value={w}>{t(`testCases.browserConfig.waitUntil.${w}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Selector field */}
      {needsSelector && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.selectorLabel")}</Label>
          <Input
            className="h-8"
            value={config.selector || ""}
            onChange={(e) => onChange({ selector: e.target.value })}
            placeholder={t("testCases.browserConfig.selectorPlaceholder")}
          />
          <p className="text-[11px] text-muted-foreground/70">{t("testCases.browserConfig.selectorHint")}</p>
        </div>
      )}

      {/* Value field (fill/select) */}
      {needsValue && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.valueLabel")}</Label>
          <Input
            className="h-8"
            value={config.value || ""}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={t("testCases.browserConfig.valuePlaceholder")}
          />
          <p className="text-[11px] text-muted-foreground/70">{t("testCases.browserConfig.valueHint")}</p>
        </div>
      )}

      {/* Clear option (fill) */}
      {needsClear && (
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={config.clear !== false}
            onCheckedChange={(checked) => onChange({ clear: !!checked })}
          />
          <span className="text-muted-foreground">{t("testCases.browserConfig.clearLabel")}</span>
        </label>
      )}

      {/* Click options */}
      {needsClickOptions && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.buttonLabel")}</Label>
            <Select value={config.button || "left"} onValueChange={(v) => onChange({ button: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOUSE_BUTTONS.map((b) => (
                  <SelectItem key={b} value={b}>{t(`testCases.browserConfig.button.${b}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.clickCountLabel")}</Label>
            <Input
              type="number"
              className="h-8"
              min={1}
              value={config.clickCount || 1}
              onChange={(e) => onChange({ clickCount: Number(e.target.value) || 1 })}
            />
          </div>
          <label className="flex items-end gap-2 text-xs cursor-pointer pb-1">
            <Checkbox
              checked={config.force || false}
              onCheckedChange={(checked) => onChange({ force: !!checked })}
            />
            <span className="text-muted-foreground">{t("testCases.browserConfig.forceLabel")}</span>
          </label>
        </div>
      )}

      {/* Force option for non-click selector actions */}
      {needsSelector && !needsClickOptions && ["check", "uncheck", "hover", "fill"].includes(action) && (
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={config.force || false}
            onCheckedChange={(checked) => onChange({ force: !!checked })}
          />
          <span className="text-muted-foreground">{t("testCases.browserConfig.forceLabel")}</span>
        </label>
      )}

      {/* Wait options */}
      {needsWaitOptions && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.durationLabel")}</Label>
            <Input
              type="number"
              className="h-8"
              min={0}
              value={config.duration || ""}
              onChange={(e) => onChange({ duration: e.target.value ? Number(e.target.value) : undefined })}
              placeholder={t("testCases.browserConfig.durationPlaceholder")}
            />
          </div>
          {config.selector && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.stateLabel")}</Label>
              <Select value={config.state || "visible"} onValueChange={(v) => onChange({ state: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ELEMENT_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`testCases.browserConfig.state.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Screenshot options */}
      {needsScreenshotOptions && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.selectorLabel")}</Label>
            <Input
              className="h-8"
              value={config.selector || ""}
              onChange={(e) => onChange({ selector: e.target.value || undefined })}
              placeholder={t("testCases.browserConfig.selectorPlaceholder")}
            />
          </div>
          <label className="flex items-end gap-2 text-xs cursor-pointer pb-1">
            <Checkbox
              checked={config.fullPage || false}
              onCheckedChange={(checked) => onChange({ fullPage: !!checked })}
            />
            <span className="text-muted-foreground">{t("testCases.browserConfig.fullPageLabel")}</span>
          </label>
        </div>
      )}

      {/* Extract options */}
      {needsExtractOptions && (
        <div className="space-y-2">
          {/* Source selector */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.extractSourceLabel")}</Label>
              <Select
                value={config.source || "dom"}
                onValueChange={(v) => {
                  const patch: Record<string, any> = { source: v };
                  if (v === "screenshot") {
                    patch.selector = undefined;
                    patch.attribute = undefined;
                    patch.lang = "chi_sim+eng";
                  } else {
                    patch.lang = undefined;
                    patch.selector = "";
                  }
                  onChange(patch);
                }}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXTRACT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`testCases.browserConfig.extractSource.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.variableNameLabel")}</Label>
              <Input
                className="h-8"
                value={config.variableName || ""}
                onChange={(e) => onChange({ variableName: e.target.value })}
                placeholder={t("testCases.browserConfig.variableNamePlaceholder")}
              />
            </div>
          </div>
          {/* DOM source: selector + attribute */}
          {config.source !== "screenshot" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.selectorLabel")}</Label>
                <Input
                  className="h-8"
                  value={config.selector || ""}
                  onChange={(e) => onChange({ selector: e.target.value })}
                  placeholder={t("testCases.browserConfig.selectorPlaceholder")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.attributeLabel")}</Label>
                <Input
                  className="h-8"
                  value={config.attribute || ""}
                  onChange={(e) => onChange({ attribute: e.target.value || undefined })}
                  placeholder={t("testCases.browserConfig.attributePlaceholder")}
                />
              </div>
            </div>
          )}
          {/* Screenshot source: OCR language */}
          {config.source === "screenshot" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.ocrLangLabel")}</Label>
                <Select
                  value={config.lang || "chi_sim+eng"}
                  onValueChange={(v) => onChange({ lang: v })}
                >
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OCR_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{t(`testCases.browserConfig.ocrLang.${l}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assert options */}
      {needsAssertOptions && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.assertTypeLabel")}</Label>
              <Select
                value={config.assertion?.type || "text"}
                onValueChange={(v) => onChange({ assertion: { ...config.assertion, type: v } })}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSERTION_TYPES.map((at) => (
                    <SelectItem key={at} value={at}>{t(`testCases.browserConfig.assertType.${at}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.assertOperatorLabel")}</Label>
              <Select
                value={config.assertion?.operator || "equals"}
                onValueChange={(v) => onChange({ assertion: { ...config.assertion, operator: v } })}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSERTION_OPERATORS.map((op) => (
                    <SelectItem key={op} value={op}>{t(`testCases.browserConfig.assertOperator.${op}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Selector for element-based assertions */}
          {["text", "value", "visible", "hidden", "attribute", "count"].includes(config.assertion?.type) && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.selectorLabel")}</Label>
              <Input
                className="h-8"
                value={config.assertion?.selector || ""}
                onChange={(e) => onChange({ assertion: { ...config.assertion, selector: e.target.value } })}
                placeholder={t("testCases.browserConfig.selectorPlaceholder")}
              />
            </div>
          )}
          {/* Attribute field for attribute assertion */}
          {config.assertion?.type === "attribute" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.attributeLabel")}</Label>
              <Input
                className="h-8"
                value={config.assertion?.attribute || ""}
                onChange={(e) => onChange({ assertion: { ...config.assertion, attribute: e.target.value } })}
                placeholder={t("testCases.browserConfig.attributePlaceholder")}
              />
            </div>
          )}
          {/* Screenshot property selector for screenshot assertion */}
          {config.assertion?.type === "screenshot" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.screenshotPropertyLabel")}</Label>
              <Select
                value={config.assertion?.property || "fileExists"}
                onValueChange={(v) => onChange({ assertion: { ...config.assertion, property: v, expected: v === "fileExists" ? true : config.assertion?.expected } })}
              >
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCREENSHOT_PROPERTIES.map((sp) => (
                    <SelectItem key={sp} value={sp}>{t(`testCases.browserConfig.screenshotProperty.${sp}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* Visual diff baseline path and threshold */}
          {config.assertion?.type === "visualDiff" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.baselinePathLabel")}</Label>
                {baselineList.length > 0 ? (
                  <Select
                    value={config.assertion?.baselinePath || ""}
                    onValueChange={(val) => onChange({ assertion: { ...config.assertion, baselinePath: val } })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={t("baselines.selectBaseline")} />
                    </SelectTrigger>
                    <SelectContent>
                      {baselineList.map((b) => (
                        <SelectItem key={b.name} value={b.path}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8"
                    value={config.assertion?.baselinePath || ""}
                    onChange={(e) => onChange({ assertion: { ...config.assertion, baselinePath: e.target.value } })}
                    placeholder={t("baselines.noBaselines")}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.thresholdLabel")}</Label>
                  <Input
                    type="number"
                    className="h-8"
                    min={0}
                    max={1}
                    step={0.01}
                    value={config.assertion?.threshold ?? 0.1}
                    onChange={(e) => onChange({ assertion: { ...config.assertion, threshold: Number(e.target.value) } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.diffPercentageThresholdLabel")}</Label>
                  <Input
                    type="number"
                    className="h-8"
                    min={0}
                    step={0.1}
                    value={config.assertion?.expected ?? 1.0}
                    onChange={(e) => onChange({ assertion: { ...config.assertion, expected: Number(e.target.value) } })}
                  />
                </div>
              </div>
            </>
          )}
          {/* Expected value for non-boolean assertions */}
          {!["visible", "hidden"].includes(config.assertion?.type) && !(config.assertion?.type === "screenshot" && config.assertion?.property === "fileExists") && !(config.assertion?.type === "visualDiff") && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.expectedLabel")}</Label>
              <Input
                className="h-8"
                value={config.assertion?.expected ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = Number(val);
                  onChange({ assertion: { ...config.assertion, expected: val === "" ? "" : isNaN(num) ? val : num } });
                }}
                placeholder={t("testCases.browserConfig.expectedPlaceholder")}
              />
            </div>
          )}
        </div>
      )}

      {/* Cookie options */}
      {needsCookieOptions && (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.cookieNameLabel")}</Label>
            <Input
              className="h-8"
              value={config.cookieName || ""}
              onChange={(e) => onChange({ cookieName: e.target.value })}
              placeholder={t("testCases.browserConfig.cookieNamePlaceholder")}
            />
          </div>
          {needsCookieValue && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.cookieValueLabel")}</Label>
              <Input
                className="h-8"
                value={config.cookieValue || ""}
                onChange={(e) => onChange({ cookieValue: e.target.value })}
                placeholder={t("testCases.browserConfig.cookieValuePlaceholder")}
              />
            </div>
          )}
          {needsCookieAdvanced && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.cookieDomainLabel")}</Label>
                  <Input
                    className="h-8"
                    value={config.cookieDomain || ""}
                    onChange={(e) => onChange({ cookieDomain: e.target.value || undefined })}
                    placeholder={t("testCases.browserConfig.cookieDomainPlaceholder")}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.cookiePathLabel")}</Label>
                  <Input
                    className="h-8"
                    value={config.cookiePath || "/"}
                    onChange={(e) => onChange({ cookiePath: e.target.value })}
                    placeholder="/"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={config.cookieHttpOnly || false}
                    onCheckedChange={(checked) => onChange({ cookieHttpOnly: !!checked })}
                  />
                  <span className="text-muted-foreground">{t("testCases.browserConfig.cookieHttpOnlyLabel")}</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={config.cookieSecure || false}
                    onCheckedChange={(checked) => onChange({ cookieSecure: !!checked })}
                  />
                  <span className="text-muted-foreground">{t("testCases.browserConfig.cookieSecureLabel")}</span>
                </label>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.cookieSameSiteLabel")}</Label>
                  <Select value={config.cookieSameSite || "Lax"} onValueChange={(v) => onChange({ cookieSameSite: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COOKIE_SAMESITE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          {action === "getCookie" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.variableNameLabel")}</Label>
              <Input
                className="h-8"
                value={config.variableName || ""}
                onChange={(e) => onChange({ variableName: e.target.value })}
                placeholder={t("testCases.browserConfig.variableNamePlaceholder")}
              />
            </div>
          )}
        </div>
      )}

      {/* Storage options */}
      {needsStorageOptions && (
        <div className="space-y-2">
          {needsStorageType ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.storageTypeLabel")}</Label>
              <Select value={config.storageType || "all"} onValueChange={(v) => onChange({ storageType: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORAGE_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`testCases.browserConfig.storageType.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.storageKeyLabel")}</Label>
                <Input
                  className="h-8"
                  value={config.storageKey || ""}
                  onChange={(e) => onChange({ storageKey: e.target.value })}
                  placeholder={t("testCases.browserConfig.storageKeyPlaceholder")}
                />
              </div>
              {needsStorageValue && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.storageValueLabel")}</Label>
                  <Input
                    className="h-8"
                    value={config.storageValue || ""}
                    onChange={(e) => onChange({ storageValue: e.target.value })}
                    placeholder={t("testCases.browserConfig.storageValuePlaceholder")}
                  />
                </div>
              )}
              {["getLocalStorage", "getSessionStorage"].includes(action) && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.variableNameLabel")}</Label>
                  <Input
                    className="h-8"
                    value={config.variableName || ""}
                    onChange={(e) => onChange({ variableName: e.target.value })}
                    placeholder={t("testCases.browserConfig.variableNamePlaceholder")}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* File upload options */}
      {needsFilePath && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.filePathLabel")}</Label>
          <Input
            className="h-8"
            value={config.filePath || ""}
            onChange={(e) => onChange({ filePath: e.target.value })}
            placeholder={t("testCases.browserConfig.filePathPlaceholder")}
          />
        </div>
      )}

      {/* Dialog options */}
      {needsDialogOptions && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.dialogActionLabel")}</Label>
              <Select value={config.dialogAction || "accept"} onValueChange={(v) => onChange({ dialogAction: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIALOG_ACTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`testCases.browserConfig.dialogAction.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {config.dialogAction === "accept" && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.dialogPromptTextLabel")}</Label>
              <Input
                className="h-8"
                value={config.dialogPromptText || ""}
                onChange={(e) => onChange({ dialogPromptText: e.target.value || undefined })}
                placeholder={t("testCases.browserConfig.dialogPromptTextPlaceholder")}
              />
            </div>
          )}
        </div>
      )}

      {/* Keyboard options */}
      {needsKeyboardOptions && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.keyLabel")}</Label>
          <Input
            className="h-8"
            value={config.key || ""}
            onChange={(e) => onChange({ key: e.target.value })}
            placeholder={t("testCases.browserConfig.keyPlaceholder")}
          />
        </div>
      )}

      {/* Timeout (common for most actions) */}
      {needsTimeout && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("testCases.browserConfig.timeoutLabel")}</Label>
            <Input
              type="number"
              className="h-8"
              min={1000}
              step={1000}
              value={config.timeout || 30000}
              onChange={(e) => onChange({ timeout: Number(e.target.value) || 30000 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
