export default {
  // Common - عام
  common: {
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    confirm: 'تأكيد',
    yes: 'نعم',
    no: 'لا',
    ok: 'موافق',
    goBack: 'رجوع',
    today: 'اليوم',
    noData: 'لا توجد بيانات',
  },

  // Tabs - التبويبات
  tabs: {
    employees: 'الموظفين',
    attendance: 'الحضور',
    wages: 'الأجور',
  },

  // Employee - الموظف
  employee: {
    title: 'الموظفين',
    addEmployee: 'إضافة موظف',
    editEmployee: 'تعديل الموظف',
    employeeDetails: 'تفاصيل الموظف',
    searchPlaceholder: 'البحث عن موظف...',
    noEmployees: 'لا يوجد موظفين',
    noEmployeesHint: 'اضغط على زر + لإضافة أول موظف',
    name: 'الاسم',
    phone: 'الهاتف',
    role: 'المنصب / الوظيفة',
    wageType: 'نوع الأجر',
    dailyRate: 'الأجر اليومي',
    hourlyRate: 'الأجر بالساعة',
    joinDate: 'تاريخ الالتحاق',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    notes: 'ملاحظات',
    notesOptional: 'ملاحظات (اختياري)',
    deleteConfirmTitle: 'حذف الموظف',
    deleteConfirmMessage: 'هل أنت متأكد من حذف {{name}}؟ سيتم حذف جميع سجلات الحضور الخاصة به.',
    saveChanges: 'حفظ التغييرات',
    employeeNotFound: 'الموظف غير موجود',
  },

  // Attendance - الحضور
  attendance: {
    title: 'تسجيل الحضور',
    history: 'سجل الحضور',
    viewHistory: 'عرض السجل',
    present: 'حاضر',
    absent: 'غائب',
    halfDay: 'نصف يوم',
    hoursWorked: 'ساعات العمل',
    noActiveEmployees: 'لا يوجد موظفين نشطين',
    noActiveEmployeesHint: 'أضف موظفين من تبويب الموظفين أولاً',
    noRecords: 'لا توجد سجلات حضور',
    noRecordsHint: 'لم يتم تسجيل حضور لهذا الأسبوع',
    week: 'الأسبوع',
    daily: 'يومي',
    hourly: 'بالساعة',
  },

  // Wages - الأجور
  wages: {
    title: 'ملخص الأجور',
    wageDetails: 'تفاصيل الأجور',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    totalWages: 'إجمالي الأجور',
    daysWorked: 'أيام العمل',
    employees: 'الموظفين',
    totalWage: 'إجمالي الأجر',
    daysPresent: 'حاضر',
    halfDays: 'أنصاف أيام',
    daysAbsent: 'غائب',
    hours: 'ساعات',
    dailyBreakdown: 'التفصيل اليومي',
    noWageData: 'لا توجد بيانات أجور',
    noWageDataHint: 'سجل الحضور لرؤية حسابات الأجور',
    noAttendanceRecords: 'لا توجد سجلات حضور',
  },

  // Validation - التحقق
  validation: {
    required: 'هذا الحقل مطلوب',
    invalidNumber: 'يجب أن يكون رقماً موجباً',
    nameRequired: 'الاسم مطلوب',
    phoneRequired: 'الهاتف مطلوب',
    roleRequired: 'المنصب مطلوب',
    wageRateRequired: 'معدل الأجر مطلوب',
  },

  // Currency - العملة (الدينار الجزائري)
  currency: {
    symbol: 'د.ج',
    format: '{{amount}} د.ج',
  },
};
