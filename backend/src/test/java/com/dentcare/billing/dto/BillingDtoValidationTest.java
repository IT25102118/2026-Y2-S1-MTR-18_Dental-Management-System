package com.dentcare.billing.dto;

import com.dentcare.billing.entity.PaymentMethod;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class BillingDtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("1. CreateInvoiceRequest accepts valid canonical data")
    void testCreateInvoiceRequestValid() {
        InvoiceItemRequest item1 = new InvoiceItemRequest(10L, "Root Canal", 1, new BigDecimal("150.00"));
        InvoiceItemRequest item2 = new InvoiceItemRequest("Examination", 2, new BigDecimal("45.50"));

        CreateInvoiceRequest request = new CreateInvoiceRequest(
                1001L,
                2001L,
                LocalDate.of(2026, 3, 15),
                List.of(item1, item2),
                new BigDecimal("10.00"),
                "Standard clinic charges"
        );

        Set<ConstraintViolation<CreateInvoiceRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("2. Missing patientId is rejected with validation violation")
    void testCreateInvoiceRequestMissingPatientId() {
        CreateInvoiceRequest request = new CreateInvoiceRequest();
        request.setPatientId(null);

        Set<ConstraintViolation<CreateInvoiceRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("patientId")
                && v.getMessage().contains("Patient ID is required"));
    }

    @Test
    @DisplayName("3. Invalid or blank item description is rejected")
    void testInvoiceItemRequestBlankDescription() {
        InvoiceItemRequest emptyDesc = new InvoiceItemRequest("", 1, new BigDecimal("50.00"));
        InvoiceItemRequest nullDesc = new InvoiceItemRequest(null, 1, new BigDecimal("50.00"));
        InvoiceItemRequest blankDesc = new InvoiceItemRequest("   ", 1, new BigDecimal("50.00"));

        assertThat(validator.validate(emptyDesc)).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
        assertThat(validator.validate(nullDesc)).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
        assertThat(validator.validate(blankDesc)).anyMatch(v -> v.getPropertyPath().toString().equals("description"));
    }

    @Test
    @DisplayName("4. Zero or negative quantity in invoice item is rejected")
    void testInvoiceItemRequestInvalidQuantity() {
        InvoiceItemRequest zeroQty = new InvoiceItemRequest("Cleaning", 0, new BigDecimal("50.00"));
        InvoiceItemRequest negativeQty = new InvoiceItemRequest("Cleaning", -3, new BigDecimal("50.00"));
        InvoiceItemRequest nullQty = new InvoiceItemRequest("Cleaning", null, new BigDecimal("50.00"));

        assertThat(validator.validate(zeroQty)).anyMatch(v -> v.getPropertyPath().toString().equals("quantity"));
        assertThat(validator.validate(negativeQty)).anyMatch(v -> v.getPropertyPath().toString().equals("quantity"));
        assertThat(validator.validate(nullQty)).anyMatch(v -> v.getPropertyPath().toString().equals("quantity"));
    }

    @Test
    @DisplayName("5. Negative unit price in invoice item is rejected")
    void testInvoiceItemRequestNegativeUnitPrice() {
        InvoiceItemRequest negativePrice = new InvoiceItemRequest("Filling", 1, new BigDecimal("-10.00"));
        InvoiceItemRequest nullPrice = new InvoiceItemRequest("Filling", 1, null);

        assertThat(validator.validate(negativePrice)).anyMatch(v -> v.getPropertyPath().toString().equals("unitPrice"));
        assertThat(validator.validate(nullPrice)).anyMatch(v -> v.getPropertyPath().toString().equals("unitPrice"));
    }

    @Test
    @DisplayName("6. RecordPaymentRequest rejects zero payment amount")
    void testRecordPaymentRequestZeroAmount() {
        RecordPaymentRequest request = new RecordPaymentRequest(BigDecimal.ZERO, PaymentMethod.CASH);

        Set<ConstraintViolation<RecordPaymentRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("amount"));
    }

    @Test
    @DisplayName("7. RecordPaymentRequest rejects negative payment amount")
    void testRecordPaymentRequestNegativeAmount() {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("-25.00"), PaymentMethod.CARD);

        Set<ConstraintViolation<RecordPaymentRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("amount"));
    }

    @Test
    @DisplayName("8. RecordPaymentRequest requires PaymentMethod")
    void testRecordPaymentRequestMissingMethod() {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("100.00"), null);

        Set<ConstraintViolation<RecordPaymentRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("paymentMethod")
                && v.getMessage().contains("Payment method is required"));
    }

    @Test
    @DisplayName("9. Request DTOs do not expose caller-controlled financial state or arbitrary status")
    void testRequestDtosDoNotExposeAuthoritativeFinancialState() {
        List<Class<?>> requestDtoClasses = List.of(
                CreateInvoiceRequest.class,
                UpdateDraftInvoiceRequest.class,
                InvoiceItemRequest.class,
                RecordPaymentRequest.class
        );

        List<String> forbiddenFieldNames = List.of(
                "total", "totalamount", "subtotal", "paidamount", "paid",
                "balance", "balanceamount", "status", "invoicestatus",
                "invoicenumber", "paymentnumber", "linetotal", "recordedby"
        );

        for (Class<?> clazz : requestDtoClasses) {
            Field[] fields = clazz.getDeclaredFields();
            for (Field field : fields) {
                String normalizedName = field.getName().toLowerCase();
                assertThat(forbiddenFieldNames)
                        .as("Class %s must not expose server-authoritative field '%s'", clazz.getSimpleName(), field.getName())
                        .doesNotContain(normalizedName);
            }
        }
    }

    @Test
    @DisplayName("16. No card-sensitive fields exist in payment DTO contracts")
    void testNoCardSensitiveFieldsInPaymentContracts() {
        List<Class<?>> paymentContracts = List.of(
                RecordPaymentRequest.class,
                PaymentResponse.class,
                ReceiptResponse.class
        );

        List<String> sensitiveKeywords = List.of(
                "cardnumber", "cvv", "cvc", "pan", "pin", "securitycode",
                "expirymonth", "expiryyear", "cardholder", "password", "token"
        );

        for (Class<?> clazz : paymentContracts) {
            Field[] fields = clazz.getDeclaredFields();
            for (Field field : fields) {
                String normalizedName = field.getName().toLowerCase();
                for (String sensitive : sensitiveKeywords) {
                    assertThat(normalizedName)
                            .as("Class %s must not contain sensitive payment field: %s", clazz.getSimpleName(), field.getName())
                            .doesNotContain(sensitive);
                }
            }
        }
    }

    @Test
    @DisplayName("Nested item validation triggers when CreateInvoiceRequest contains invalid line item")
    void testNestedItemValidationFails() {
        InvoiceItemRequest invalidItem = new InvoiceItemRequest("", 0, new BigDecimal("-5.00"));
        CreateInvoiceRequest request = new CreateInvoiceRequest(1001L, List.of(invalidItem));

        Set<ConstraintViolation<CreateInvoiceRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().startsWith("items[0]"));
    }

    @Test
    @DisplayName("Negative discount in CreateInvoiceRequest and UpdateDraftInvoiceRequest is rejected")
    void testNegativeDiscountRejected() {
        CreateInvoiceRequest createReq = new CreateInvoiceRequest(1001L);
        createReq.setDiscountAmount(new BigDecimal("-1.00"));
        assertThat(validator.validate(createReq)).anyMatch(v -> v.getPropertyPath().toString().equals("discountAmount"));

        UpdateDraftInvoiceRequest updateReq = new UpdateDraftInvoiceRequest();
        updateReq.setDiscountAmount(new BigDecimal("-0.50"));
        assertThat(validator.validate(updateReq)).anyMatch(v -> v.getPropertyPath().toString().equals("discountAmount"));
    }

    @Test
    @DisplayName("Monetary request fields reject more than two decimal places")
    void testMonetaryFieldsRejectExcessFractionDigits() {
        RecordPaymentRequest payment = new RecordPaymentRequest(new BigDecimal("0.999"), PaymentMethod.CASH);
        InvoiceItemRequest item = new InvoiceItemRequest("Cleaning", 1, new BigDecimal("10.999"));
        CreateInvoiceRequest create = new CreateInvoiceRequest(1001L, List.of(item));
        create.setDiscountAmount(new BigDecimal("1.999"));
        UpdateDraftInvoiceRequest update = new UpdateDraftInvoiceRequest();
        update.setDiscountAmount(new BigDecimal("2.999"));

        assertThat(validator.validate(payment)).anyMatch(v -> v.getPropertyPath().toString().equals("amount"));
        assertThat(validator.validate(item)).anyMatch(v -> v.getPropertyPath().toString().equals("unitPrice"));
        assertThat(validator.validate(create)).anyMatch(v -> v.getPropertyPath().toString().contains("unitPrice"));
        assertThat(validator.validate(create)).anyMatch(v -> v.getPropertyPath().toString().equals("discountAmount"));
        assertThat(validator.validate(update)).anyMatch(v -> v.getPropertyPath().toString().equals("discountAmount"));
    }

    @Test
    @DisplayName("Monetary request fields accept values matching DECIMAL(10,2)")
    void testMonetaryFieldsAcceptDatabasePrecision() {
        RecordPaymentRequest payment = new RecordPaymentRequest(new BigDecimal("99999999.99"), PaymentMethod.CARD);
        InvoiceItemRequest item = new InvoiceItemRequest("Procedure", 1, new BigDecimal("99999999.99"));
        CreateInvoiceRequest create = new CreateInvoiceRequest(1001L, List.of(item));
        create.setDiscountAmount(new BigDecimal("10.50"));

        assertThat(validator.validate(payment)).isEmpty();
        assertThat(validator.validate(item)).isEmpty();
        assertThat(validator.validate(create)).isEmpty();
    }
}
