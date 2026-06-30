// Declarative configuration for the Settings page.
// Custom-settings sub-sections, their fields, and pricing item catalogues are
// transcribed here so SettingsPage.tsx stays a thin renderer over this data.
// All custom-settings values live in the org's free-form `settings` JSONB,
// keyed by `key`. Each field carries the default that matches the design.

export type SettingField =
  | { kind: "toggle"; key: string; label: string; desc?: string; default?: boolean }
  | { kind: "number"; key: string; label: string; desc?: string; default?: number }
  | { kind: "text"; key: string; label: string; desc?: string; placeholder?: string; default?: string }
  | { kind: "select"; key: string; label: string; desc?: string; options: string[]; default?: string };

export interface SettingsSection {
  key: string;
  label: string;
  icon: string; // lucide icon name (resolved in the page)
  fields: SettingField[];
}

// ------------------------------------------------------------------ //
// Custom Settings — left-rail sections                               //
// ------------------------------------------------------------------ //

export const CUSTOM_SECTIONS: SettingsSection[] = [
  {
    key: "administrative",
    label: "Administrative Settings",
    icon: "Settings",
    fields: [
      { kind: "toggle", key: "use_new_ids_from_april", label: "Use New IDs from April", desc: "If enabled, it'll start all the new IDs for blood request, defer donor etc from 1st April", default: true },
      { kind: "toggle", key: "fix_id_prefix", label: "Fix ID prefix", desc: "If enabled, the prefix part of IDs will be auto-fixed and users can only modify the remaining part." },
      { kind: "toggle", key: "display_untested_stock", label: "Display Untested Stock", desc: "Show untested stock in daily report" },
      { kind: "toggle", key: "digital_donor_current_camp_only", label: "Digital donor share: current camp only", desc: "When enabled, Camp → Digital Donors → Share QR Code and Share Link encode only that camp's invitation page, not the full list of upcoming camps." },
      { kind: "toggle", key: "use_date_based_daily_report", label: "Use date-based daily report", desc: "Enable to apply issue-date logic: components next day, reservations on creation/issue date." },
      { kind: "toggle", key: "display_moic_signature_in_register", label: "Display Signature of MOIC in Register", desc: "This will display Signature of MOIC in Register report" },
      { kind: "toggle", key: "component_validation_authorized_only", label: "Enable Component Validation For Authorized Users Only", desc: "Enable this option to restrict component validation to users who have the necessary permissions." },
      { kind: "toggle", key: "only_show_donor_section", label: "Only Show Donor Section", desc: "If enabled, this will display donor section only" },
      { kind: "toggle", key: "display_govt_pricing", label: "Display Govt. Pricing", desc: "If enabled, this will display government pricing in invoice" },
      { kind: "toggle", key: "display_eraktkosh_link", label: "Display E-Raktkosh Link", desc: "If enabled, E-Raktkosh link will appear in the navigation bar" },
      { kind: "number", key: "opening_balance_payment_summary", label: "Opening balance(Payment summary)", default: 0 },
      { kind: "toggle", key: "show_ward_permissions", label: "Show Ward Permissions", desc: "If enabled, then ward cannot see blood request billing" },
      { kind: "toggle", key: "manual_discount_refund_reason", label: "Manual Discount/Refund Reason Entry", desc: "If enabled, we can get a option to manually give any input in the Discount and Refund reasons." },
      { kind: "text", key: "blood_bank_static_ip", label: "Blood Bank Static IP (if any)", desc: "Keep it blank if there is no static IP. If provided, staff members will only be able to log in from within the blood bank.", placeholder: "e.g. 203.0.113.5" },
      { kind: "number", key: "opening_balance_payment_summary_2", label: "Opening balance (Payment summary)", desc: "Starting balance amount used in payment summary.", default: 0 },
    ],
  },
  {
    key: "discard",
    label: "Blood Discard Settings",
    icon: "Trash2",
    fields: [
      { kind: "toggle", key: "auto_discard_expired", label: "Auto Discard Expired Components", desc: "If enabled, RAKT will automatically discard expired components." },
      { kind: "toggle", key: "auto_discard_less_quantity", label: "Auto Discard Less Quantity Bag", desc: "If enabled, RAKT will auto discard less quantity bags.", default: true },
      { kind: "toggle", key: "auto_discard_tti_reactive", label: "Auto Discard TTI Reactive Case", desc: "If enabled, RAKT will auto discard TTI reactive bags.", default: true },
      { kind: "toggle", key: "auto_discard_irregular_antibodies", label: "Auto Discard Blood with Irregular Antibodies", desc: "If enabled, RAKT will auto discard blood with irregular antibodies.", default: true },
      { kind: "toggle", key: "display_autoclave", label: "Display Autoclave", desc: "If enabled, RAKT will show options to add information about autoclave such as date time, BMW agency etc." },
    ],
  },
  {
    key: "request",
    label: "Blood Request Settings",
    icon: "Droplet",
    fields: [
      { kind: "toggle", key: "display_slide_grouping", label: "Display Slide Grouping", desc: "This will display slide grouping section in blood request timeline", default: true },
      { kind: "toggle", key: "display_billing_in_request", label: "Display Billing in Blood Request", desc: "This will display billing data in dashboard, billing section of blood Request and invoice", default: true },
      { kind: "toggle", key: "display_patient_blood_grouping", label: "Display Patient Blood Grouping", desc: "This will display patient blood grouping section in blood request timeline", default: true },
      { kind: "toggle", key: "display_crossmatch_compatibility", label: "Display Crossmatch Compatibility", desc: "This will display crossmatch compatibility section in blood request timeline.", default: true },
      { kind: "toggle", key: "allow_female_ffp", label: "Allow Female FFP to be issued in Blood Request", desc: "If enabled, will allow FFP to be issued for Female as well.", default: true },
      { kind: "toggle", key: "blood_reservation", label: "Blood Reservation", desc: "This Allows Blood to be reserved for patients." },
      { kind: "toggle", key: "editable_datetime_reservation", label: "Editable Date and Time in Blood Reservation Request", desc: "This Allows to edit date and time in blood reservation request." },
      { kind: "toggle", key: "change_invoice_no_reservation", label: "Change Invoice No. in Blood Reservation", desc: "If a patient asks 1x unit to be issued immediately and 1x unit for reservation. Then this allows to show separate invoice no for both of these requests." },
      { kind: "toggle", key: "check_expiry_before_issuing", label: "Check Expiry Date Before Issuing Blood", desc: "Allow to issue backdated/expired stock for clearance", default: true },
      { kind: "toggle", key: "custom_item_pricing", label: "Custom Item Pricing", desc: "If you have a specific set of pricing for container charges, crossmatch charges then toggle this on so RAKT can auto add the charges in the blood request." },
      { kind: "toggle", key: "allow_inward_stock", label: "Allow to Inward Stock from other Blood Banks", desc: "This allows you to inward components from other blood banks.", default: true },
      { kind: "toggle", key: "allow_bulk_transfer", label: "Allow to Bulk Transfer Units to other Blood Banks", desc: "This allows to bulk transfer units to other blood banks/hospitals.", default: true },
      { kind: "toggle", key: "issue_without_crossmatch", label: "Issue Blood without Crossmatch", desc: "This Allows Blood to be issued without crossmatch" },
      { kind: "toggle", key: "print_2x_invoices", label: "Print 2x Invoices for Blood Request", desc: "This allows you to keep 1 copy for your accounting and other one for patient.", default: true },
      { kind: "toggle", key: "customized_invoice_reservation", label: "Customized Invoice for Reservation Request", desc: "This allows to customise Invoice items for reservation blood request." },
      { kind: "toggle", key: "allow_editing_billing_issue", label: "Allow Editing Billing in Issue Page", desc: "When enabled, adds a button in the issue page to edit payment modes, discounts, and refunds." },
      { kind: "toggle", key: "allow_editing_component_name_issue", label: "Allow Editing Component Name in Issue Page", desc: "When enabled, users can edit component names in the issue page." },
      { kind: "toggle", key: "ask_receiver_details", label: "Ask Receiver Details While Issuing Blood", desc: "This will display receiver's name and phone number field on issue page of blood request" },
      { kind: "toggle", key: "display_payment_mode", label: "Display Payment Mode in Blood Request", desc: "When enabled, shows payment mode used in Blood Request section.", default: true },
      { kind: "toggle", key: "show_composite_label", label: "Show Composite Label While Issuing Blood", desc: "This will display print composite label in issue page of blood request", default: true },
      { kind: "toggle", key: "display_staff_id_signature_compat", label: "Display Staff ID and Signature In Compatibility Report", desc: "This will display staff ID and signature in compatibility report of blood request." },
      { kind: "toggle", key: "display_moic_name_compat", label: "Display Medical Officer's Name in Compatibility Report", desc: "This will display medical officer's name instead of cross checked / issued by section of compatibility report" },
      { kind: "toggle", key: "display_sample_sent_received", label: "Display Sample Sent / Received at in Blood Request Details", desc: "This will allow to edit sample sent / received datetime inside blood request details page." },
      { kind: "toggle", key: "display_donor_blood_group", label: "Display Donor Blood Group", desc: "This will display donor blood group in Compatibility Label and Compatibility Report.", default: true },
      { kind: "toggle", key: "display_batch_lot_number", label: "Display Batch/Lot Number", desc: "This will display Batch/Lot Number in Compatibility Report.", default: true },
      { kind: "toggle", key: "show_delivery_charges", label: "Show delivery charges", desc: "Provide additional field to add delivery charges." },
      { kind: "toggle", key: "display_issue_note", label: "Display Issue Note in Blood Request Details", desc: "Allows adding unit dispatch from the blood centre so wards can track dispatched units." },
      { kind: "toggle", key: "display_patient_barcode_print", label: "Display Patient Barcode Print Option", desc: "This will display patient barcode print button in billing page" },
      { kind: "toggle", key: "show_hospital_commission", label: "Show Hospital Commission", desc: "If enabled, this will show hospital commission for the blood requests." },
      { kind: "select", key: "auto_reservation_close_after", label: "Automatic reservations will close after", desc: "Allows Admin to set a 24 to 72 hours duration period to close automatic reservations set.", options: ["24 Hours", "48 Hours", "72 Hours"], default: "48 Hours" },
    ],
  },
  {
    key: "component",
    label: "Component Settings",
    icon: "Boxes",
    fields: [
      { kind: "toggle", key: "automatic_weight_conversion", label: "Automatic weight conversion", desc: "This auto converts bag weight from gm to ml & deduct empty bag's weight." },
      { kind: "toggle", key: "auto_shift_tested_stock", label: "Automatically Shift Tested Stock", desc: "Auto adds the validated units to the dashboard's stock by skipping the IV step in blood bag section." },
      { kind: "toggle", key: "auto_shift_issues_to_lab", label: "Automatically Shift components with issues to lab", desc: "Auto adds component to lab for further checking if component volume is not in range or blood group isn't matching." },
      { kind: "toggle", key: "cryoprecipitate_preparation", label: "Cryoprecipitate Preparation", desc: "This allows to create Cyro and CPP in component preparation." },
      { kind: "toggle", key: "prp_preparation", label: "PRP Preparation", desc: "Allows creation of PRP in component preparation; if not issued, it auto-converts to FFP after 5 days." },
      { kind: "toggle", key: "display_expiry_dc_act", label: "Display Expiry Date as per D&C Act", desc: "if enabled, date of collection will be considered as 1st day (not 0th day)." },
      { kind: "toggle", key: "display_365_days_ffp", label: "Display 365 days expiry date for FFP", desc: "This makes the expiry date of FFP to 365 days (currently 1 year = 364 days)" },
      { kind: "toggle", key: "display_segment_no_bag_entry", label: "Display Segment No. in Bag Entry", desc: "This makes segment no. mandatory while adding blood bags.", default: true },
      { kind: "toggle", key: "display_edit_form", label: "Display Edit Form", desc: "This will automatically display Edit form in Blood Processing, Grouping and TTI" },
      { kind: "toggle", key: "display_spin_options", label: "Display 1st, 2nd, 3rd spin options in component processing", desc: "This will allow to edit spin details for PRBC, FFP, PLC, CRYO, CPP" },
      { kind: "toggle", key: "plc_bc_quadra_filtration", label: "Do you want to make PLC-BC in Quadra bag filtration case?", desc: "Enable this option to make PLC-BC in Quadra bag filtration case.", default: true },
      { kind: "toggle", key: "prbc_lp_plc_bc_quadra_non_filtration", label: "Do you want to make PRBC-LP & PLC-BC in Quadra bag non filtration case?", desc: "Enable this option to make PRBC-LP & PLC-BC in Quadra bag non filtration case.", default: true },
      { kind: "toggle", key: "display_leuko_reduction", label: "Display Leuko Reduction", desc: "If enabled, leuko reduction button will be visible in donor details (Blood Bag)" },
      { kind: "toggle", key: "exclude_component_from_preparation", label: "Show option to exclude component from preparation", desc: "This allows to exclude selected components from preparation." },
      { kind: "toggle", key: "blood_cbc_apheresis", label: "Blood CBC (Only Apheresis)", desc: "If enabled, CBC results for apheresis units will be available in testing." },
      { kind: "toggle", key: "blood_cbc_all", label: "Blood CBC (All Components)", desc: "If enabled, CBC results for all units will be available in testing." },
      { kind: "toggle", key: "display_aliquot_options", label: "Display Aliquot Options", desc: "Allows splitting units or preparing aliquots from components." },
      { kind: "toggle", key: "component_wise_billing", label: "Component Wise Billing", desc: "This allows to print component wise bills." },
      { kind: "toggle", key: "approximate_volume_range", label: "Use approximate volume range in measurement", desc: "This auto fills component volume and skips the component volume processing step." },
      { kind: "toggle", key: "display_segment_grouping", label: "Display Segment Grouping", desc: "This allows to perform segment grouping before component preparation.", default: true },
      { kind: "select", key: "component_expiry_warning_days", label: "Component expiry warning in days", desc: "Choose how many days before expiry RAKT should warn staff about components nearing expiry.", options: ["3 days", "7 days", "14 days", "30 days"], default: "7 days" },
    ],
  },
  {
    key: "dashboard",
    label: "Dashboard Settings",
    icon: "LayoutDashboard",
    fields: [
      { kind: "toggle", key: "dashboard_multi_view", label: "Multi Dashboard View", desc: "If enabled, master users can see a unified dashboard across their connected blood banks" },
      { kind: "toggle", key: "dashboard_display_news", label: "Display News", desc: "Show news scrolling on the dashboard.", default: true },
      { kind: "toggle", key: "dashboard_display_components_issued", label: "Display Components Issued", desc: "Show the Components Issued card on the dashboard.", default: true },
      { kind: "toggle", key: "dashboard_display_current_stock", label: "Display Current Stock", desc: "Show the Current Stock card on the dashboard.", default: true },
      { kind: "toggle", key: "dashboard_display_total_revenue", label: "Display Total Revenue", desc: "Show financial data (monthly earnings till date) on dashboard.", default: true },
      { kind: "toggle", key: "dashboard_display_work_completed_today", label: "Display Total Work Completed Today", desc: "Show the Total Work Completed Today card on the dashboard.", default: true },
      { kind: "toggle", key: "dashboard_display_expiring_soon", label: "Display Expiring Soon", desc: "Show the Expiring Soon card on the dashboard.", default: true },
    ],
  },
  {
    key: "donor",
    label: "Donor Settings",
    icon: "UserPlus",
    fields: [
      { kind: "toggle", key: "donor_govt_id_mandatory", label: "Make Govt ID mandatory for Donor Form", desc: "If enabled, the staff must fill the Govt ID before saving donor form." },
      { kind: "toggle", key: "donor_contact_mandatory", label: "Make Contact Number mandatory for Donor Form", desc: "If enabled, staff must fill the contact number before saving donor form." },
      { kind: "toggle", key: "donor_display_date_filter", label: "Display date filter", desc: "If enabled, date range filtering of records will happen in donor and reception sections." },
      { kind: "toggle", key: "donor_display_digital_signature", label: "Display Digital Signature", desc: "If enabled, donor digital signature page will be visible for donor while filling details.", default: true },
      { kind: "toggle", key: "donor_display_questionnaire", label: "Display Donor Questionnaire", desc: "If enabled, donor questionnaire button will be visible in Invitations detail page.", default: true },
      { kind: "select", key: "donor_report_delay_days", label: "Donor Report Delay In Days", desc: "Choose how many days after donation to send donor blood report notifications on (SMS, email, WhatsApp).", options: ["0 days", "1 day", "3 days", "7 days", "14 days", "30 days"], default: "7 days" },
    ],
  },
  {
    key: "grouping",
    label: "Grouping Settings",
    icon: "Users",
    fields: [
      { kind: "toggle", key: "grouping_combine_forward_reverse", label: "Combine Forward and Reverse Grouping", desc: "This displays Forward and Reverse Grouping combined on the same page.", default: true },
      { kind: "toggle", key: "grouping_phenotyping", label: "Phenotyping", desc: "Allows to do phenotyping of the blood." },
      { kind: "toggle", key: "grouping_show_full_blood_group", label: "Show Full Blood Group in PLC, FFP, SDP", desc: "This displays full blood group (including RH factor) for PLC, FFP, SDP." },
      { kind: "toggle", key: "grouping_validation_authorized_only", label: "Enable Grouping Validation For Authorized Users Only", desc: "Enable this option to restrict grouping validation to users who have the necessary permissions." },
      { kind: "toggle", key: "grouping_autofill_from_segment", label: "Auto Fill Forward/Reverse grouping Based On Segment Grouping", desc: "If enabled, Forward/Reverse grouping will be automatically saved while saving segment grouping." },
      { kind: "toggle", key: "grouping_show_bombay_blood_group", label: "Show Bombay Blood Group", desc: "We can enable this if the requirement of blood request is Bombay blood group." },
      { kind: "select", key: "grouping_report_based_on", label: "Show Grouping report based on", desc: "Choose whether grouping reports use collection date or grouping date.", options: ["Collection Date", "Grouping Date"], default: "Collection Date" },
    ],
  },
  {
    key: "id",
    label: "ID Settings",
    icon: "Barcode",
    fields: [
      { kind: "toggle", key: "id_donor_check", label: "Donor ID Check", desc: "When enabled, donor IDs are validated against the length set below." },
      { kind: "number", key: "id_donor_length", label: "Donor ID Length", desc: "Expected number of characters for a donor ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_defer_donor_check", label: "Defer Donor ID Check", desc: "When enabled, defer donor IDs are validated against the length set below." },
      { kind: "number", key: "id_defer_donor_length", label: "Defer Donor ID Length", desc: "Expected number of characters for a defer donor ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_blood_request_check", label: "Blood Request ID Check", desc: "When enabled, blood request IDs are validated against the length set below." },
      { kind: "number", key: "id_blood_request_length", label: "Blood Request ID Length", desc: "Expected number of characters for a blood request ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_bulk_request_check", label: "Bulk Request ID Check", desc: "When enabled, bulk blood request IDs are validated against the length set below." },
      { kind: "number", key: "id_bulk_request_length", label: "Bulk Request ID Length", desc: "Expected number of characters for a bulk request ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_fractionation_request_check", label: "Fractionation Request ID Check", desc: "When enabled, fractionation request IDs are validated against the length set below." },
      { kind: "number", key: "id_fractionation_request_length", label: "Fractionation Request ID Length", desc: "Expected number of characters for a fractionation request ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_bag_check", label: "Blood Bag ID Check", desc: "When enabled, blood bag IDs are validated against the length set below." },
      { kind: "number", key: "id_bag_length", label: "Blood Bag ID Length", desc: "Expected number of characters for a blood bag ID when ID check is on.", default: 5 },
      { kind: "toggle", key: "id_fix_prefix", label: "Fix ID prefix", desc: "If enabled, the prefix part of IDs is auto-fixed and users can only modify the remaining part." },
      { kind: "text", key: "id_donor_prefix", label: "Donor ID Prefix", desc: "Prefix automatically prepended to every donor ID.", placeholder: "e.g. D" },
      { kind: "text", key: "id_request_prefix", label: "Blood Request ID Prefix", desc: "Prefix automatically prepended to every blood request ID.", placeholder: "e.g. R" },
      { kind: "toggle", key: "id_reset_yearly", label: "Reset IDs Yearly", desc: "Restart sequential IDs at the beginning of each financial year." },
    ],
  },
  {
    key: "letterheads",
    label: "Letter Heads & Remarks",
    icon: "FileText",
    fields: [
      { kind: "text", key: "letterhead_header", label: "Letterhead Header Text", placeholder: "Centre name & address line" },
      { kind: "text", key: "letterhead_footer", label: "Letterhead Footer Text", placeholder: "Footer / disclaimer line" },
      { kind: "text", key: "default_remarks", label: "Default Report Remarks", placeholder: "Remarks printed on reports" },
    ],
  },
  {
    key: "notification",
    label: "Notification Settings",
    icon: "Bell",
    fields: [
      { kind: "toggle", key: "notify_low_stock", label: "Low Stock Notifications", desc: "Notify staff when stock falls below threshold.", default: true },
      { kind: "toggle", key: "notify_expiry", label: "Expiry Notifications", desc: "Notify staff about components nearing expiry.", default: true },
      { kind: "toggle", key: "notify_new_request", label: "New Blood Request Notifications", desc: "Notify staff when a new blood request is raised." },
      { kind: "toggle", key: "notify_email", label: "Email Notifications", desc: "Send notifications over email as well." },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: "BarChart3",
    fields: [
      { kind: "toggle", key: "reports_include_logo", label: "Include Logo on Reports", desc: "Print the centre logo on generated reports.", default: true },
      { kind: "toggle", key: "reports_include_signature", label: "Include Signature Line", desc: "Add a signature line at the bottom of reports." },
      { kind: "select", key: "reports_default_format", label: "Default Export Format", options: ["PDF", "Excel", "CSV"], default: "PDF" },
    ],
  },
  {
    key: "store",
    label: "Store Settings",
    icon: "Warehouse",
    fields: [
      { kind: "number", key: "store_low_stock_threshold", label: "Low Stock Threshold (units)", desc: "Trigger a low-stock warning at this unit count.", default: 10 },
      { kind: "toggle", key: "store_track_temperature", label: "Track Storage Temperature", desc: "Capture refrigerator/freezer temperature logs." },
      { kind: "toggle", key: "store_fifo_issue", label: "Enforce FIFO Issue", desc: "Suggest oldest units first when issuing stock.", default: true },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    icon: "Wrench",
    fields: [
      { kind: "toggle", key: "tools_enable_barcode_generator", label: "Enable Barcode Generator", desc: "Show the barcode generator tool in the Tools menu.", default: true },
      { kind: "toggle", key: "tools_enable_bulk_import", label: "Enable Bulk Import", desc: "Allow bulk importing of donor / stock data." },
    ],
  },
  {
    key: "tti",
    label: "TTI Settings",
    icon: "FlaskConical",
    fields: [
      { kind: "toggle", key: "tti_hiv", label: "HIV", desc: "Include HIV in the TTI panel.", default: true },
      { kind: "toggle", key: "tti_hbsag", label: "HBsAg", desc: "Include HBsAg (Hepatitis B) in the TTI panel.", default: true },
      { kind: "toggle", key: "tti_hcv", label: "HCV", desc: "Include HCV (Hepatitis C) in the TTI panel.", default: true },
      { kind: "toggle", key: "tti_syphilis", label: "Syphilis (VDRL)", desc: "Include Syphilis in the TTI panel.", default: true },
      { kind: "toggle", key: "tti_malaria", label: "Malaria", desc: "Include Malaria in the TTI panel.", default: true },
      { kind: "toggle", key: "tti_nat", label: "NAT Testing", desc: "Enable Nucleic Acid Testing." },
    ],
  },
];

// ------------------------------------------------------------------ //
// Integrations / Options / Billing / Customisations tabs             //
// ------------------------------------------------------------------ //

export const INTEGRATIONS_FIELDS: SettingField[] = [
  { kind: "toggle", key: "integration_eraktkosh", label: "e-Rakt-Kosh Sync", desc: "Sync stock and donation data with the national e-Rakt-Kosh portal." },
  { kind: "text", key: "integration_eraktkosh_key", label: "e-Rakt-Kosh API Key", placeholder: "Paste API key" },
  { kind: "toggle", key: "integration_whatsapp", label: "WhatsApp Notifications", desc: "Send donor and request updates over WhatsApp." },
  { kind: "toggle", key: "integration_sms", label: "SMS Gateway", desc: "Send SMS alerts via the configured gateway." },
  { kind: "text", key: "integration_sms_sender_id", label: "SMS Sender ID", placeholder: "e.g. RAKTBC" },
  { kind: "text", key: "integration_smtp_host", label: "SMTP Host", placeholder: "smtp.example.com" },
  { kind: "toggle", key: "integration_payment_gateway", label: "Payment Gateway", desc: "Accept online payments for blood requests." },
];

export const OPTIONS_FIELDS: SettingField[] = [
  { kind: "select", key: "option_timezone", label: "Timezone", options: ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore"], default: "Asia/Kolkata" },
  { kind: "select", key: "option_date_format", label: "Date Format", options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], default: "DD/MM/YYYY" },
  { kind: "select", key: "option_currency", label: "Currency", options: ["INR (₹)", "USD ($)", "AED (د.إ)"], default: "INR (₹)" },
  { kind: "toggle", key: "option_24h_time", label: "Use 24-hour time", desc: "Display time in 24-hour format throughout the app.", default: true },
  { kind: "toggle", key: "option_session_timeout", label: "Auto Logout on Idle", desc: "Log staff out automatically after a period of inactivity." },
];

// ------------------------------------------------------------------ //
// Options tab — editable master lists rendered as chips              //
// ------------------------------------------------------------------ //
// Each list's working value lives in the org `settings` JSONB under `key`.
// When the key is unset, `items` (the seeded default) is used.

export interface OptionList {
  key: string;
  label: string;
  /** small badge under the label, e.g. "Optional Charges" */
  sublabel?: string;
  /** "filled" = solid indigo pills (editable masters), "outline" = light removable chips */
  variant: "filled" | "outline";
  /** whether each chip shows a pencil to rename in place */
  editable?: boolean;
  /** placeholder shown in the add-input */
  placeholder?: string;
  items: string[];
}

export const OPTIONS_LISTS: OptionList[] = [
  {
    key: "options_blood_component",
    label: "Blood Component",
    variant: "filled",
    editable: true,
    placeholder: "e.g. PRBC",
    items: ["PRBC", "FFP", "PLC", "WB"],
  },
  {
    key: "options_blood_bag_type",
    label: "Blood Bag Type",
    variant: "outline",
    placeholder: "e.g. DB-SAGM-350",
    items: [
      "DB-SAGM-350", "DB-SAGM-450", "TB-SAGM-350", "TB-SAGM-450",
      "QUADRA-350F", "QUADRA-450F", "QUADRA-350N", "QUADRA-450N",
      "SDP-CLOSED", "SB-350", "SB-450", "DB-350", "DB-450", "TB-350", "TB-450",
    ],
  },
  {
    key: "options_blood_request",
    label: "Blood Request",
    sublabel: "Optional Charges",
    variant: "outline",
    placeholder: "e.g. Container Charges",
    items: [
      "Antibody screening (patient)", "Anti HBc", "Bacterial detection", "Chemiluminescence",
      "Container Charges", "Grouping and cross matching by automation",
      "Grouping and cross matching by semi automation", "Irradiation",
      "IV Generation ELISA (HBsAg)", "IV Generation ELISA (HCV)", "IV Generation ELISA (HIV)",
      "Leuco filtration Platelets", "Leuco filtration Red cells", "NAT",
      "Phenotypic for extended serology", "Plasma Processing Charges (Buffy Coat Method)",
      "Platelets Processing Charges (Buffy Coat Method)", "Processing Charges",
      "Red Cells Processing Charges (Buffy Coat Method)",
      "Reservation Charges (Grouping and cross matching)", "Transfer Bag",
    ],
  },
  {
    key: "options_transfusion_indication",
    label: "Transfusion Indication",
    variant: "filled",
    placeholder: "e.g. Anaemia",
    items: [
      "Anaemia", "Bleed", "Bleeding Diathesis", "Burn", "Burn Case", "Cancer",
      "Chronic Kidney Disease", "Chronic Renal Failure", "Coagulation Factor Deficiency",
      "Dengue", "Dialysis", "Ectopic Pregnancy", "Exchange Transfusion", "Heart Surgery",
      "H/T", "Liver Transplant", "Lower segment Caesarean section", "Low Platelet Level",
      "Massive Blood Transfusion", "Neonatal Exchange Transfusion", "Neonate",
      "Neurogenic Disease", "Other", "Platelet Dysfunction", "Pregnancy",
      "Pulmonary Heart Disease", "Road Traffic Accident", "Shock", "Surgery",
      "Thalassemia", "Trauma",
    ],
  },
  {
    key: "options_defer_reason",
    label: "Defer Reason",
    variant: "outline",
    placeholder: "e.g. Low H.B",
    items: [
      "Abortion", "Acute Infection Of Bladder (Cystitis) / Uti",
      "Acute Infection Of Kidney (Pyelonephritis)", "Angina Pectoris", "Ankylosing Spondylitis",
      "Anti-Arrhythmic, Anti-Covulsions, Anticoagulant, Anti-Thyroid Drugs, Cytotoxic Drugs, Cardiac Failure Drugs (Digitalis)",
      "Antibiotics", "Anti Rabies Vaccination Following Animal Bite",
      "Anti-Tetanus Serum, Anti-Venom Serum, Anti-Diphtheria Serum And Anti-Gas Gangrene Serum",
      "Anxiety And Mood Disorders", "Any Medication Of Unknown Nature", "Asthmatic Attack",
      "Asthmatics On Steroids", "At Risk For Hepatitis By Tattoos, Acupuncture, Body Piercing Or Scarification",
      "Bleeding Disorder And Unexplained Bleeding Tendency", "Breast Feeding", "Cancer Surgery",
      "Cardiac Medication (Digitalis, Nitro-Glycerine)", "Chest Pain",
      "Chronic Infection Of Kidney/ Kidney Disease/ Renal Failure",
      "Chronic Liver Disease / Liver Failure", "Chronic Sinusitis",
      "Cold, Flu, Cough, Sore Throat Or Acute Sinusitis", "Conjunctivitis",
      "Convulsions And Epilepsy", "Coronary Artery Disease", "Dengue/ Chikungunya",
      "Dental Surgery Under Anaethesia", "Dermatomyosis", "Diarrhoea",
      "Donors Who Have Had An Unexplained Delayed Faint",
      "Etretinate, Acitretin Or Isotretinoin (Used For Acne)",
      "Finasteride/Dutasteride (Used To Treat Benign Prostatatic Hyperplasia)", "Gi Endoscopy",
      "Gonorrhoea", "Haemoglobinopathies And Red Cell Enzyme Deficiencies With Known History Of Haemolysis",
      "Have Aids", "Have/At Risk Of HIV Infection", "Hepatitis B,C",
      "Hepatitis B Immunoglobulin(S)", "History Of Malignant Thyroid Tumours",
      "History Of Measles, Mumps, Chickenpox", "Hyper/Hypo Thyroid", "Hypertensive Heart Disease",
      "Insulin", "Jaundice (Hepatitis A)", "Jaundice (Hepatitis B/C)",
      "Ketoconazole, Antihelminthic Drugs", "Leishmaniasis", "Leprosy", "Live Attenuated Vaccines",
      "Low H.B", "Major Surgery", "Malaria", "Malignancy", "Menstruation",
      "Minor Non Specific Symptoms ( Malaise, Pain, Headache Etc )", "Minor Surgery",
      "Myocardial Infarction (Heart Attack)", "Non Live Vaccines And Toxoid",
      "Open Heart Surgery Including By-Pass Surgery", "Oral Anti-Diabetic Drugs", "Osteomyelitis",
      "Other Endocrine Disorders", "Piroxicam, Dipyridamole", "Polycythaemia Vera", "Pregnancy",
      "Radioactive Contrast Material", "Received Blood Transfusion",
      "Recipient Of Organ, Stem Cell And Tissue Transplants", "Repeat Donor",
      "Resident of other countries", "Rheumatic Heart Disease With Residual Damage",
      "Salicylates (Aspirin), Other NSAIDS", "Schizophrenia", "Scleroderma",
      "Severe Allergic Disorders", "Shortness Of Breath",
      "Spouse/ Close Contact With Individual Suffering With Hepatitis",
      "Spouse/ Partner Of Individual Receiving Transufsion Of Blood/Components",
      "Stomach Ulcer With Symptoms Or With Recurrent Bleeding", "Sverre Rheumatoid Arthritis",
      "Swelling Of Feet", "Swine Flu", "Syphilis (Genital Sore Or Generalised Skin Rashes)",
      "Systemic Lupus Erythematosis", "Thyroid Disease Under Investigation/ Not Known Hepatitis A Or E",
      "Thyrotoxicosis Due To Grave's Disease", "Ticlopidine, Clopidogrel", "Tooth Extraction",
      "Tuberculosis", "Typhoid", "Unknown Hepatitis", "Unwilling", "Zika Virus/ West Nile Virus",
    ],
  },
  {
    key: "options_component_volume",
    label: "Component Volume",
    variant: "outline",
    placeholder: "e.g. 350 ml",
    items: [],
  },
  {
    key: "options_optional_item_charges",
    label: "Optional Item Charges",
    variant: "outline",
    placeholder: "e.g. Transfer Bag",
    items: [],
  },
  {
    key: "options_name_prefix",
    label: "Name Prefix",
    variant: "outline",
    placeholder: "e.g. Mr. / Male",
    items: ["Mr. / Male", "Ms. / Female", "Mrs. / Female", "Master / Male", "Baby"],
  },
];

export const BILLING_FIELDS: SettingField[] = [
  { kind: "text", key: "billing_gst_number", label: "GST Number", placeholder: "e.g. 09ABCDE1234F1Z5" },
  { kind: "select", key: "billing_invoice_prefix_mode", label: "Invoice Number Mode", options: ["Sequential", "Date-based", "Manual"], default: "Sequential" },
  { kind: "number", key: "billing_starting_invoice_no", label: "Starting Invoice Number", default: 1 },
  { kind: "toggle", key: "billing_show_gst_on_invoice", label: "Show GST on Invoice", desc: "Print GST details on generated invoices." },
  { kind: "toggle", key: "billing_round_off", label: "Round Off Invoice Total", desc: "Round invoice totals to the nearest rupee." , default: true },
  { kind: "text", key: "billing_invoice_terms", label: "Invoice Terms & Conditions", placeholder: "Printed at the bottom of every invoice" },
];

// Compliance flags shown as toggles under the Customisations tab.
export const COMPLIANCE_FLAGS: { key: string; label: string }[] = [
  { key: "nabh", label: "NABH" },
  { key: "nbtc", label: "NBTC" },
  { key: "erakt_kosh", label: "e-Rakt-Kosh" },
  { key: "drugs_cosmetics_act_1940", label: "Drugs & Cosmetics Act 1940" },
];

// ------------------------------------------------------------------ //
// Blood Pricing                                                      //
// ------------------------------------------------------------------ //

// The compact card grid shown on the Blood Pricing tab.
export const PRICING_ITEMS: { key: string; label: string; default: number }[] = [
  { key: "PRBC", label: "PRBC", default: 1200 },
  { key: "FFP", label: "FFP", default: 400 },
  { key: "PLC", label: "PLC", default: 400 },
  { key: "PRBC-LP", label: "PRBC-LP", default: 1200 },
  { key: "WB", label: "WB", default: 1200 },
  { key: "PLC-BC", label: "PLC-BC", default: 400 },
  { key: "Apheresis", label: "Apheresis", default: 11000 },
  { key: "CRYO", label: "CRYO", default: 250 },
  { key: "Processing Charges", label: "Processing Charges", default: 0 },
  { key: "Granulocytes Concentrate", label: "Granulocytes Concentrate", default: 11000 },
  { key: "Reservation Charges", label: "Reservation Charges", default: 0 },
  { key: "CPP", label: "CPP", default: 250 },
];

// The full pricing editor ("Dashboard") with every component & aliquot rate.
export const FULL_PRICING_ITEMS: { key: string; label: string; default: number }[] = [
  { key: "PRBC", label: "Packed Red Blood Cells", default: 1200 },
  { key: "PRBC-LP", label: "Packed Red Blood Cells (LP)", default: 1200 },
  { key: "PRBC-LR", label: "Packed Red Blood Cells (LR)", default: 1450 },
  { key: "PRBC-LD", label: "Packed Red Blood Cells (LD)", default: 1450 },
  { key: "FFP", label: "Fresh Frozen Plasma", default: 400 },
  { key: "FFP-LR", label: "Fresh Frozen Plasma (LR)", default: 400 },
  { key: "PLC", label: "Platelet Concentrate", default: 400 },
  { key: "PLC-BC", label: "Platelet Concentrate (Buffy Coat)", default: 400 },
  { key: "PLC-LR", label: "Platelet Concentrate (LR)", default: 400 },
  { key: "SDP", label: "Single Donor Platelet", default: 11000 },
  { key: "SDP-LR", label: "Single Donor Platelet (LR)", default: 11000 },
  { key: "Granulocytes Concentrate", label: "Granulocytes Concentrate", default: 11000 },
  { key: "WB", label: "Whole Blood", default: 1200 },
  { key: "WB-LR", label: "Whole Blood (LR)", default: 1450 },
  { key: "CRYO", label: "Cryoprecipitate", default: 250 },
  { key: "CRYO-LR", label: "Cryoprecipitate (LR)", default: 250 },
  { key: "CPP", label: "Cryo Poor Plasma", default: 250 },
  { key: "CPP-LR", label: "Cryo Poor Plasma (LR)", default: 250 },
  { key: "PRP", label: "Platelet Rich Plasma", default: 250 },
  { key: "PRP-LR", label: "Platelet Rich Plasma (LR)", default: 250 },
  { key: "Processing Charges", label: "Processing Charges", default: 0 },
  { key: "Reservation Charges", label: "Reservation charges", default: 0 },
  { key: "Nat Charges", label: "Nat charges", default: 400 },
  { key: "Therapeutic Donation", label: "Therapeutic Donation", default: 300 },
  { key: "PRBC Aliquot", label: "PRBC Aliquot", default: 400 },
  { key: "PRBC LP Aliquot", label: "PRBC LP Aliquot", default: 400 },
  { key: "PRBC LR Aliquot", label: "PRBC LR Aliquot", default: 400 },
  { key: "PRBC LD Aliquot", label: "PRBC LD Aliquot", default: 400 },
  { key: "FFP Aliquot", label: "FFP Aliquot", default: 400 },
  { key: "FFP LR Aliquot", label: "FFP LR Aliquot", default: 400 },
  { key: "PLC Aliquot", label: "PLC Aliquot", default: 400 },
  { key: "PLC LR Aliquot", label: "PLC LR Aliquot", default: 400 },
  { key: "PLC BC Aliquot", label: "PLC BC Aliquot", default: 400 },
  { key: "PRP Aliquot", label: "PRP Aliquot", default: 400 },
  { key: "PRP LR Aliquot", label: "PRP LR Aliquot", default: 400 },
  { key: "SDP Aliquot", label: "SDP Aliquot", default: 400 },
  { key: "SDP LR Aliquot", label: "SDP LR Aliquot", default: 400 },
  { key: "WB Aliquot", label: "WB Aliquot", default: 400 },
  { key: "WB LR Aliquot", label: "WB LR Aliquot", default: 400 },
];

export const TABS = [
  { key: "general", label: "General" },
  { key: "pricing", label: "Blood Pricing" },
  { key: "custom", label: "Custom Settings" },
  { key: "integrations", label: "Integrations" },
  { key: "options", label: "Options" },
  { key: "billing", label: "Billing" },
  { key: "customisations", label: "Customisations" },
];
