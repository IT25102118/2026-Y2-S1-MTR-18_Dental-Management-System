package com.dentcare.billing.exception;

import com.dentcare.billing.entity.InvoiceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.assertj.core.api.Assertions.assertThat;

class BillingExceptionHandlerTest {

    private BillingExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new BillingExceptionHandler();
    }

    @Test
    @DisplayName("handleInvoiceNotFound maps InvoiceNotFoundException to 404 Not Found")
    void testHandleInvoiceNotFound() {
        InvoiceNotFoundException ex = new InvoiceNotFoundException(123L);

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleInvoiceNotFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(404);
        assertThat(response.getBody().getError()).isEqualTo("Not Found");
        assertThat(response.getBody().getMessage()).contains("123");
        assertThat(response.getBody().getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("handlePaymentNotFound maps PaymentNotFoundException to 404 Not Found")
    void testHandlePaymentNotFound() {
        PaymentNotFoundException ex = new PaymentNotFoundException(456L);

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handlePaymentNotFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(404);
        assertThat(response.getBody().getError()).isEqualTo("Not Found");
        assertThat(response.getBody().getMessage()).contains("456");
        assertThat(response.getBody().getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("handleInvalidPaymentStatus maps InvalidPaymentStatusException to 400 Bad Request")
    void testHandleInvalidPaymentStatus() {
        InvalidPaymentStatusException ex = new InvalidPaymentStatusException(10L, com.dentcare.billing.entity.PaymentStatus.REVERSED, "Already reversed");

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleInvalidPaymentStatus(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).contains("REVERSED");
    }

    @Test
    @DisplayName("handleOverpayment maps OverpaymentException to 400 Bad Request")
    void testHandleOverpayment() {
        OverpaymentException ex = new OverpaymentException(new java.math.BigDecimal("150.00"), new java.math.BigDecimal("100.00"));

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleOverpayment(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).contains("exceeds outstanding balance");
    }

    @Test
    @DisplayName("handleInvalidInvoiceStatus maps InvalidInvoiceStatusException to 400 Bad Request")
    void testHandleInvalidInvoiceStatus() {
        InvalidInvoiceStatusException ex = new InvalidInvoiceStatusException(1L, InvoiceStatus.PAID, "Invoice is finalized");

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleInvalidInvoiceStatus(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).contains("PAID");
    }

    @Test
    @DisplayName("handleBillingValidation maps BillingValidationException to 400 Bad Request")
    void testHandleBillingValidation() {
        BillingValidationException ex = new BillingValidationException("Validation failed for invoice");

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleBillingValidation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).isEqualTo("Validation failed for invoice");
    }

    @Test
    @DisplayName("handleMethodArgumentNotValid maps binding errors to 400 Bad Request with fieldErrors")
    void testHandleMethodArgumentNotValid() throws Exception {
        Object target = new Object();
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(target, "createInvoiceRequest");
        bindingResult.addError(new FieldError("createInvoiceRequest", "patientId", "Patient ID is required"));
        bindingResult.addError(new FieldError("createInvoiceRequest", "discountAmount", "Must be non-negative"));

        MethodParameter parameter = new MethodParameter(
                this.getClass().getDeclaredMethod("dummyMethod", String.class),
                0
        );
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter, bindingResult);

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleMethodArgumentNotValid(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getFieldErrors())
                .containsEntry("patientId", "Patient ID is required")
                .containsEntry("discountAmount", "Must be non-negative");
    }

    @Test
    @DisplayName("handleHttpMessageNotReadable maps malformed requests to 400 Bad Request")
    void testHandleHttpMessageNotReadable() {
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Required request body is missing");

        ResponseEntity<BillingErrorResponse> response = exceptionHandler.handleHttpMessageNotReadable(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(400);
        assertThat(response.getBody().getError()).isEqualTo("Bad Request");
        assertThat(response.getBody().getMessage()).contains("Malformed request body");
    }

    @SuppressWarnings("unused")
    private void dummyMethod(String param) {
    }
}