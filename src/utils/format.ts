export function fmtMoney(amount: number | string, cur: string) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const val = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) + ' ' + cur;
}

export function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

export function daysLeft(iso: string) {
  const now = new Date();
  const d = new Date(iso);
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function statusTone(s: string) {
  switch (s) {
    case 'submitted': return 'blue';
    case 'processing': return 'purple';
    case 'issued':
    case 'delivered': return 'green';
    case 'overdue':
    case 'rejected': return 'red';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
}

export function statusLabel(s: string) {
  switch (s) {
    case 'submitted': return 'بانتظار مدير الفيز';
    case 'processing': return 'قيد المعالجة';
    case 'issued': return 'صدرت';
    case 'delivered': return 'تم التسليم';
    case 'overdue': return 'متأخرة';
    case 'rejected': return 'مرفوضة';
    case 'cancelled': return 'ملغاة';
    default: return s;
  }
}

// ----------------------------
// Passport statuses (جوازات)
// ----------------------------

export function passportStatusTone(s: string) {
  switch (s) {
    case 'submitted':
      return 'blue';
    case 'processing':
      return 'purple';
    case 'ready':
      return 'green';
    case 'delivered':
      return 'green';
    case 'overdue':
      return 'red';
    case 'rejected':
      return 'red';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}

export function passportStatusLabel(s: string) {
  switch (s) {
    case 'submitted':
      return 'جديد';
    case 'processing':
      return 'قيد المعالجة';
    case 'ready':
      return 'جاهز';
    case 'delivered':
      return 'تم التسليم';
    case 'overdue':
      return 'متأخر';
    case 'rejected':
      return 'مرفوض';
    case 'cancelled':
      return 'ملغى';
    default:
      return s;
  }
}

// ----------------------------
// Flight tickets statuses (تذاكر طيران)
// ----------------------------

export function flightTicketStatusTone(s: string) {
  switch (s) {
    case 'pending':
      return 'amber';
    case 'sold':
      return 'blue';
    case 'issued':
      return 'green';
    case 'refunded':
      return 'amber';
    case 'void':
      return 'purple';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}

export function flightTicketStatusLabel(s: string) {
  switch (s) {
    case 'pending':
      return 'معلّقة للموافقة';
    case 'sold':
      return 'مباعة';
    case 'issued':
      return 'مصدّرة';
    case 'refunded':
      return 'مسترجعة';
    case 'void':
      return 'ملغاة (Void)';
    case 'cancelled':
      return 'ملغاة';
    default:
      return s;
  }
}

// ----------------------------
// External tickets statuses (تذاكر خارجية)
// ----------------------------

export function extTicketStatusTone(s: string) {
  switch (s) {
    case 'active':
      return 'blue';
    case 'delivered':
      return 'green';
    case 'cancelled':
      return 'gray';
    case 'void':
      return 'purple';
    default:
      return 'gray';
  }
}

export function extTicketStatusLabel(s: string) {
  switch (s) {
    case 'active':
      return 'نشطة';
    case 'delivered':
      return 'تم التسليم';
    case 'cancelled':
      return 'ملغاة';
    case 'void':
      return 'فويد (VOID)';
    default:
      return s;
  }
}

// ----------------------------
// Leads statuses (عملاء محتملين)
// ----------------------------

export function leadStatusTone(s: string) {
  switch (s) {
    case 'open': return 'amber';
    case 'claimed': return 'blue';
    case 'contacted': return 'purple';
    case 'interested': return 'green';
    case 'converted': return 'green';
    case 'not_interested': return 'red';
    case 'closed': return 'gray';
    default: return 'gray';
  }
}

export function leadStatusLabel(s: string) {
  switch (s) {
    case 'open': return 'بانتظار المتابعة';
    case 'claimed': return 'تم الاستلام';
    case 'contacted': return 'تم التواصل';
    case 'interested': return 'مهتم';
    case 'converted': return 'تم التحويل لبيع';
    case 'not_interested': return 'غير مهتم';
    case 'closed': return 'مغلق';
    default: return s;
  }
}

export function leadServiceLabel(s: string) {
  switch (s) {
    case 'visa': return 'فيزا';
    case 'passport': return 'جوازات';
    case 'ticket': return 'تذاكر طيران';
    case 'external_ticket': return 'تذاكر خارجية';
    case 'other': return 'أخرى';
    default: return s;
  }
}

export function leadResultLabel(s: string) {
  switch (s) {
    case 'contacted': return 'تم التواصل';
    case 'no_answer': return 'لا رد';
    case 'interested': return 'مهتم';
    case 'not_interested': return 'غير مهتم';
    case 'callback': return 'اتصال لاحقاً';
    default: return s;
  }
}

export function leadMethodLabel(s: string) {
  switch (s) {
    case 'whatsapp': return 'واتساب';
    case 'phone': return 'هاتف';
    case 'in_person': return 'شخصياً';
    case 'other': return 'أخرى';
    default: return s;
  }
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}
