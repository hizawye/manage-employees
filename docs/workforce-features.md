# Manager workflows in 1.1

Open **Work** for the current shift count, people clocked in, pending leave and completed shifts awaiting an attendance mark. All records belong to the current local account. The manager can use these workflows in Arabic or English.

| Competitor workflow | Where to find it in Manage Employees |
| --- | --- |
| When I Work and Connecteam let managers build shifts, copy weeks and use templates. [When I Work scheduler](https://help.wheniwork.com/articles/scheduler-reference-guide-computer/) · [Connecteam templates](https://help.connecteam.com/en/articles/3524929-schedule-templates) | **Shift schedule** supports role, location, notes, overnight shifts, previous-week copying and named weekly templates. Availability, existing shifts and approved leave are checked before assignment. |
| When I Work records recurring availability and lets managers review interest in open shifts. [Availability](https://help.wheniwork.net/articles/setting-your-availablity/) · [Request management](https://help.wheniwork.com/article-categories/processing-user-requests/) | In **Shift schedule**, set recurring unavailable hours. In **Open shifts**, record interest reported to the manager, then assign the person. The assignment creates a real scheduled shift. |
| Connecteam tracks clock entries and paid or unpaid breaks. [Time clock guide](https://help.connecteam.com/en/articles/5826070-time-clock-for-users) · [Breaks](https://help.connecteam.com/en/articles/3016187-how-to-set-up-breaks-paid-unpaid) | **Time clock** records punches and breaks. Review the hours for a date, including overnight work, before applying them to attendance and wages. |
| When I Work lets managers process leave by employee, status and date. [Time-off requests](https://help.wheniwork.com/articles/processing-time-off-requests-computer/) | **Time off** records a request, shows its status, and supports approval, decline and cancellation. An approved request blocks intersecting shifts. Leave tracks availability; it does not automatically grant paid hours. |
| Homebase documents CSV roster imports and timesheet exports. When I Work exports pay summaries and raw hours for a chosen period. [Homebase features](https://www.joinhomebase.com/free) · [When I Work exports](https://help.wheniwork.com/articles/exporting-time-sheets-computer/) | **Import employees** provides a CSV template, previews validation errors and skips duplicates. **Reports** exports payroll summaries, daily timesheets, clock entries, shift lists and leave registers as CSV or printable PDF. Shift reports also export an iCalendar file. |
| When I Work lets managers review, close and reopen a pay period. [Close and export a period](https://help.wheniwork.com/articles/close-and-export-payroll/) | **Pay periods** reviews a payroll month, locks its attendance and wage adjustments, and keeps the rates used at closing. A manager can reopen it for corrections. Payments can still be recorded. |

## Reading a report

A daily timesheet labels days with adjustments but no attendance as unmarked. Payroll summaries include earnings and signed adjustments by work date. The payments column uses the date money was issued, so a January payment issued in February appears in February's payments. Clock-entry exports split overnight shifts and breaks at each report boundary and use actual elapsed minutes. Schedule exports include overnight shifts intersecting the selected date range. Calendar times are local wall times and keep the saved overnight end date.

## Product boundaries

This release supports manager-entered activity in one device's workspace. Remote employee invitations, real-time employee messaging, cross-device shift bidding and push delivery require shared accounts and a server. The app does not calculate statutory payroll taxes or move money through a bank or payroll provider. The competitor references describe their own products and subscription plans.
