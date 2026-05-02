enum PaymentProvider {
  apple,
  google,
  alipay,
  wechatPay,
  stripe,
}

enum PaymentStatus {
  pending,
  processing,
  completed,
  failed,
  refunded,
  cancelled,
}

class PaymentRequest {
  final String id;
  final String userId;
  final String productId;
  final String productName;
  final int amountCents;
  final String currency;
  final PaymentProvider provider;
  final Map<String, dynamic> metadata;

  const PaymentRequest({
    required this.id,
    required this.userId,
    required this.productId,
    required this.productName,
    required this.amountCents,
    this.currency = 'CNY',
    required this.provider,
    this.metadata = const {},
  });
}

class PaymentResult {
  final String requestId;
  final PaymentStatus status;
  final String? transactionId;
  final String? receipt;
  final String? error;
  final DateTime processedAt;

  const PaymentResult({
    required this.requestId,
    required this.status,
    this.transactionId,
    this.receipt,
    this.error,
    required this.processedAt,
  });

  bool get isSuccess => status == PaymentStatus.completed;
}

abstract class PaymentService {
  Future<PaymentResult> initiatePayment(PaymentRequest request);
  Future<PaymentResult> verifyPayment(String transactionId);
  Future<PaymentResult> refundPayment(String transactionId, {String? reason});
  Future<List<PaymentResult>> getPaymentHistory(String userId);
  Future<bool> restorePurchases(String userId);
}

class StubPaymentService implements PaymentService {
  @override
  Future<PaymentResult> initiatePayment(PaymentRequest request) async {
    return PaymentResult(
      requestId: request.id,
      status: PaymentStatus.completed,
      transactionId: 'txn_${DateTime.now().millisecondsSinceEpoch}',
      processedAt: DateTime.now(),
    );
  }

  @override
  Future<PaymentResult> verifyPayment(String transactionId) async {
    return PaymentResult(
      requestId: 'verify_$transactionId',
      status: PaymentStatus.completed,
      transactionId: transactionId,
      processedAt: DateTime.now(),
    );
  }

  @override
  Future<PaymentResult> refundPayment(String transactionId, {String? reason}) async {
    return PaymentResult(
      requestId: 'refund_$transactionId',
      status: PaymentStatus.refunded,
      transactionId: transactionId,
      processedAt: DateTime.now(),
    );
  }

  @override
  Future<List<PaymentResult>> getPaymentHistory(String userId) async => [];

  @override
  Future<bool> restorePurchases(String userId) async => true;
}
