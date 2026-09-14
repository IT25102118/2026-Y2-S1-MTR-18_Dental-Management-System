package com.dentcare.billing.service;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceItemRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private InvoiceNumberGenerator invoiceNumberGenerator;

    private BillingCalculationService billingCalculationService;
    private BillingMapper billingMapper;
    private InvoiceServiceImpl invoiceService;

    @BeforeEach
    void setUp() {
        billingCalculationService = new BillingCalculationService();
        billingMapper = new BillingMapper();
        invoiceService = new InvoiceServiceImpl(
                invoiceRepository,
                paymentRepository,
                billingCalculationService,
                billingMapper,
                invoiceNumberGenerator
        );
    }

    // -------------------------------------------------------------------------
    // Draft Creation Tests (1 - 9)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("1. Create empty draft invoice when no items provided")
    void testCreateEmptyDraft() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-001");
        when(invoiceRepository.existsByInvoiceNumber("INV-TEST-001")).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateInvoiceRequest request = new CreateInvoiceRequest(101L);

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response).isNotNull();
        assertThat(response.invoiceNumber()).isEqualTo("INV-TEST-001");
        assertThat(response.patientId()).isEqualTo(101L);
        assertThat(response.status()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(response.items()).isEmpty();
        assertThat(response.subtotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.totalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.paidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.balanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("2. Create draft invoice with one line item")
    void testCreateDraftWithOneItem() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-002");
        when(invoiceRepository.existsByInvoiceNumber("INV-TEST-002")).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item = new InvoiceItemRequest(501L, "Routine Dental Cleaning", 1, new BigDecimal("80.00"));
        CreateInvoiceRequest request = new CreateInvoiceRequest(102L, List.of(item));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response).isNotNull();
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).description()).isEqualTo("Routine Dental Cleaning");
        assertThat(response.items().get(0).treatmentProcedureId()).isEqualTo(501L);
    }

    @Test
    @DisplayName("3. Server calculates lineTotal correctly using BillingCalculationService")
    void testServerCalculatesLineTotal() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-003");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item = new InvoiceItemRequest("Filling", 3, new BigDecimal("45.50"));
        CreateInvoiceRequest request = new CreateInvoiceRequest(103L, List.of(item));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.items().get(0).lineTotal()).isEqualByComparingTo(new BigDecimal("136.50"));
    }

    @Test
    @DisplayName("4. Server calculates subtotal correctly as sum of line totals")
    void testServerCalculatesSubtotal() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-004");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item1 = new InvoiceItemRequest("Item A", 2, new BigDecimal("25.00")); // 50.00
        InvoiceItemRequest item2 = new InvoiceItemRequest("Item B", 1, new BigDecimal("30.00")); // 30.00
        CreateInvoiceRequest request = new CreateInvoiceRequest(104L, List.of(item1, item2));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    @DisplayName("5. Valid discount applied correctly and deducted from subtotal")
    void testValidDiscountApplied() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-005");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item = new InvoiceItemRequest("Surgery", 1, new BigDecimal("200.00"));
        CreateInvoiceRequest request = new CreateInvoiceRequest(105L, 201L, LocalDate.now(),
                List.of(item), new BigDecimal("25.00"), "Student discount");

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(response.discountAmount()).isEqualByComparingTo(new BigDecimal("25.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("175.00"));
    }

    @Test
    @DisplayName("6. Total, paidAmount (zero), and balance derived correctly on draft creation")
    void testTotalPaidAndBalanceDerived() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-006");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item = new InvoiceItemRequest("Root Canal", 1, new BigDecimal("350.00"));
        CreateInvoiceRequest request = new CreateInvoiceRequest(106L, List.of(item));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("350.00"));
        assertThat(response.paidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.balanceAmount()).isEqualByComparingTo(new BigDecimal("350.00"));
    }

    @Test
    @DisplayName("7. Newly created invoice status is always DRAFT")
    void testStatusIsDraft() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-007");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.createDraft(new CreateInvoiceRequest(107L));

        assertThat(response.status()).isEqualTo(InvoiceStatus.DRAFT);
    }

    @Test
    @DisplayName("8. Server generates non-null and non-blank unique invoice number with collision avoidance")
    void testServerGeneratesUniqueInvoiceNumber() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-COLLISION", "INV-UNIQUE");
        when(invoiceRepository.existsByInvoiceNumber("INV-COLLISION")).thenReturn(true);
        when(invoiceRepository.existsByInvoiceNumber("INV-UNIQUE")).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.createDraft(new CreateInvoiceRequest(108L));

        assertThat(response.invoiceNumber()).isEqualTo("INV-UNIQUE");
        verify(invoiceRepository).existsByInvoiceNumber("INV-COLLISION");
        verify(invoiceRepository).existsByInvoiceNumber("INV-UNIQUE");
    }

    @Test
    @DisplayName("9. Client cannot control totals, status, or invoice number through creation request")
    void testClientCannotControlTotalsOrStatus() {
        CreateInvoiceRequest request = new CreateInvoiceRequest(109L);
        // By design contract, CreateInvoiceRequest does not even have setters or fields for:
        // invoiceNumber, total, subtotal, paidAmount, balance, status
        when(invoiceNumberGenerator.generate()).thenReturn("INV-SERVER-CONTROL");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.invoiceNumber()).isEqualTo("INV-SERVER-CONTROL");
        assertThat(response.status()).isEqualTo(InvoiceStatus.DRAFT);
    }

    // -------------------------------------------------------------------------
    // Multiple Items (10)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("10. Multiple line items calculate correct cumulative subtotal and total")
    void testMultipleItemsCalculateCorrectly() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-TEST-010");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest i1 = new InvoiceItemRequest("X-Ray", 2, new BigDecimal("30.00")); // 60.00
        InvoiceItemRequest i2 = new InvoiceItemRequest("Polishing", 1, new BigDecimal("40.00")); // 40.00
        InvoiceItemRequest i3 = new InvoiceItemRequest("Fluoride", 3, new BigDecimal("15.00")); // 45.00

        CreateInvoiceRequest request = new CreateInvoiceRequest(110L, 301L, LocalDate.now(),
                List.of(i1, i2, i3), new BigDecimal("15.00"), "Multi-item invoice");

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("145.00"));
        assertThat(response.discountAmount()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("130.00"));
        assertThat(response.balanceAmount()).isEqualByComparingTo(new BigDecimal("130.00"));
    }

    // -------------------------------------------------------------------------
    // Draft Update Tests (11 - 16)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("11. Update a DRAFT invoice successfully replaces items and notes")
    void testUpdateDraftSuccess() {
        Invoice invoice = new Invoice("INV-EXISTING-01", 201L, LocalDate.now());
        invoice.setId(1001L);
        invoice.setStatus(InvoiceStatus.DRAFT);

        when(invoiceRepository.findByIdForUpdate(1001L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest newItem = new InvoiceItemRequest("Updated Treatment", 2, new BigDecimal("50.00"));
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(List.of(newItem), new BigDecimal("10.00"), "Updated notes");

        InvoiceResponse response = invoiceService.updateDraft(1001L, request);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).description()).isEqualTo("Updated Treatment");
        assertThat(response.notes()).isEqualTo("Updated notes");
        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(response.discountAmount()).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("90.00"));
    }

    @Test
    @DisplayName("12. Update recalculates all financial totals server-side")
    void testUpdateRecalculatesAllValues() {
        Invoice invoice = new Invoice("INV-EXISTING-02", 202L, LocalDate.now());
        invoice.setId(1002L);
        invoice.setStatus(InvoiceStatus.DRAFT);
        InvoiceItem oldItem = new InvoiceItem(invoice, "Old Item", 1, new BigDecimal("20.00"), new BigDecimal("20.00"));
        invoice.addItem(oldItem);
        invoice.setSubtotal(new BigDecimal("20.00"));
        invoice.setTotalAmount(new BigDecimal("20.00"));
        invoice.setBalanceAmount(new BigDecimal("20.00"));

        when(invoiceRepository.findByIdForUpdate(1002L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceItemRequest item1 = new InvoiceItemRequest("New 1", 1, new BigDecimal("60.00"));
        InvoiceItemRequest item2 = new InvoiceItemRequest("New 2", 2, new BigDecimal("40.00"));
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(List.of(item1, item2), new BigDecimal("20.00"), null);

        InvoiceResponse response = invoiceService.updateDraft(1002L, request);

        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("140.00"));
        assertThat(response.discountAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
        assertThat(response.balanceAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
    }

    @Test
    @DisplayName("13. Invoice number remains unchanged after draft update")
    void testInvoiceNumberPreservedOnUpdate() {
        Invoice invoice = new Invoice("INV-PERMANENT-NUM", 203L, LocalDate.now());
        invoice.setId(1003L);
        invoice.setStatus(InvoiceStatus.DRAFT);

        when(invoiceRepository.findByIdForUpdate(1003L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(List.of(), BigDecimal.ZERO, "Empty items");
        InvoiceResponse response = invoiceService.updateDraft(1003L, request);

        assertThat(response.invoiceNumber()).isEqualTo("INV-PERMANENT-NUM");
    }

    @Test
    @DisplayName("14. Update of UNPAID invoice is rejected with InvalidInvoiceStatusException")
    void testUpdateUnpaidInvoiceRejected() {
        Invoice invoice = new Invoice("INV-UNPAID", 204L, LocalDate.now());
        invoice.setId(1004L);
        invoice.setStatus(InvoiceStatus.UNPAID);

        when(invoiceRepository.findByIdForUpdate(1004L)).thenReturn(Optional.of(invoice));

        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.updateDraft(1004L, request))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Only DRAFT invoices can be updated");
    }

    @Test
    @DisplayName("15. Update of PAID invoice is rejected with InvalidInvoiceStatusException")
    void testUpdatePaidInvoiceRejected() {
        Invoice invoice = new Invoice("INV-PAID", 205L, LocalDate.now());
        invoice.setId(1005L);
        invoice.setStatus(InvoiceStatus.PAID);

        when(invoiceRepository.findByIdForUpdate(1005L)).thenReturn(Optional.of(invoice));

        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.updateDraft(1005L, request))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Only DRAFT invoices can be updated");
    }

    @Test
    @DisplayName("16. Update of CANCELLED invoice is rejected with InvalidInvoiceStatusException")
    void testUpdateCancelledInvoiceRejected() {
        Invoice invoice = new Invoice("INV-CANCELLED", 206L, LocalDate.now());
        invoice.setId(1006L);
        invoice.setStatus(InvoiceStatus.CANCELLED);

        when(invoiceRepository.findByIdForUpdate(1006L)).thenReturn(Optional.of(invoice));

        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest();
        assertThatThrownBy(() -> invoiceService.updateDraft(1006L, request))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Only DRAFT invoices can be updated");
    }

    // -------------------------------------------------------------------------
    // Issuance Tests (17 - 21)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("17. DRAFT invoice with valid item(s) transitions to UNPAID and sets issuedAt")
    void testIssueDraftWithValidItems() {
        Invoice invoice = new Invoice("INV-ISSUE-01", 301L, LocalDate.now());
        invoice.setId(2001L);
        invoice.setStatus(InvoiceStatus.DRAFT);
        InvoiceItem item = new InvoiceItem(invoice, "Consultation", 1, new BigDecimal("50.00"), new BigDecimal("50.00"));
        invoice.addItem(item);

        when(invoiceRepository.findByIdForUpdate(2001L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.issueInvoice(2001L);

        assertThat(response.status()).isEqualTo(InvoiceStatus.UNPAID);
        assertThat(response.issuedAt()).isNotNull();
    }

    @Test
    @DisplayName("18. Issue empty DRAFT invoice is rejected by BR-09")
    void testIssueEmptyDraftRejected() {
        Invoice invoice = new Invoice("INV-EMPTY", 302L, LocalDate.now());
        invoice.setId(2002L);
        invoice.setStatus(InvoiceStatus.DRAFT);
        // No items

        when(invoiceRepository.findByIdForUpdate(2002L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.issueInvoice(2002L))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("BR-09");
    }

    @Test
    @DisplayName("19. Issue already UNPAID invoice is rejected with InvalidInvoiceStatusException")
    void testIssueAlreadyUnpaidRejected() {
        Invoice invoice = new Invoice("INV-ALREADY-UNPAID", 303L, LocalDate.now());
        invoice.setId(2003L);
        invoice.setStatus(InvoiceStatus.UNPAID);

        when(invoiceRepository.findByIdForUpdate(2003L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.issueInvoice(2003L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Only DRAFT invoices can be issued");
    }

    @Test
    @DisplayName("20. Issue PAID or CANCELLED invoice is rejected with InvalidInvoiceStatusException")
    void testIssuePaidOrCancelledRejected() {
        Invoice paid = new Invoice("INV-P", 304L, LocalDate.now());
        paid.setId(2004L);
        paid.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findByIdForUpdate(2004L)).thenReturn(Optional.of(paid));

        assertThatThrownBy(() -> invoiceService.issueInvoice(2004L))
                .isInstanceOf(InvalidInvoiceStatusException.class);

        Invoice cancelled = new Invoice("INV-C", 305L, LocalDate.now());
        cancelled.setId(2005L);
        cancelled.setStatus(InvoiceStatus.CANCELLED);
        when(invoiceRepository.findByIdForUpdate(2005L)).thenReturn(Optional.of(cancelled));

        assertThatThrownBy(() -> invoiceService.issueInvoice(2005L))
                .isInstanceOf(InvalidInvoiceStatusException.class);
    }

    @Test
    @DisplayName("21. Issue performs final recalculation immediately before status transition")
    void testIssueFinalRecalculation() {
        Invoice invoice = new Invoice("INV-RECALC-ISSUE", 306L, LocalDate.now());
        invoice.setId(2006L);
        invoice.setStatus(InvoiceStatus.DRAFT);

        // Intentionally mismatched lineTotal and subtotal on in-memory entity
        InvoiceItem item = new InvoiceItem(invoice, "Tooth Extraction", 2, new BigDecimal("75.00"), BigDecimal.ZERO);
        invoice.addItem(item);
        invoice.setSubtotal(BigDecimal.ZERO);
        invoice.setTotalAmount(BigDecimal.ZERO);
        invoice.setBalanceAmount(BigDecimal.ZERO);

        when(invoiceRepository.findByIdForUpdate(2006L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.issueInvoice(2006L);

        assertThat(response.status()).isEqualTo(InvoiceStatus.UNPAID);
        assertThat(response.items().get(0).lineTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(response.balanceAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    // -------------------------------------------------------------------------
    // Retrieval Tests (22 - 24)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("22. Retrieve existing invoice by ID returns mapped response")
    void testGetInvoiceById() {
        Invoice invoice = new Invoice("INV-GET-01", 401L, LocalDate.now());
        invoice.setId(3001L);

        when(invoiceRepository.findById(3001L)).thenReturn(Optional.of(invoice));

        InvoiceResponse response = invoiceService.getInvoice(3001L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(3001L);
        assertThat(response.invoiceNumber()).isEqualTo("INV-GET-01");
    }

    @Test
    @DisplayName("23. Missing invoice throws InvoiceNotFoundException")
    void testGetInvoiceMissingThrowsNotFound() {
        when(invoiceRepository.findById(99999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.getInvoice(99999L))
                .isInstanceOf(InvoiceNotFoundException.class)
                .hasMessageContaining("99999");
    }

    @Test
    @DisplayName("24. Retrieve by invoice number returns mapped response")
    void testGetInvoiceByNumber() {
        Invoice invoice = new Invoice("INV-GET-NUM-01", 402L, LocalDate.now());
        invoice.setId(3002L);

        when(invoiceRepository.findByInvoiceNumber("INV-GET-NUM-01")).thenReturn(Optional.of(invoice));

        InvoiceResponse response = invoiceService.getInvoiceByNumber("INV-GET-NUM-01");

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(3002L);
        assertThat(response.invoiceNumber()).isEqualTo("INV-GET-NUM-01");
    }

    // -------------------------------------------------------------------------
    // Precision & Locking Tests (25 - 26)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("25. BigDecimal values preserved numerically without forced scale/rounding")
    void testPrecisionPreservation() {
        when(invoiceNumberGenerator.generate()).thenReturn("INV-PRECISION");
        when(invoiceRepository.existsByInvoiceNumber(anyString())).thenReturn(false);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        BigDecimal exactPrice = new BigDecimal("12.345");
        InvoiceItemRequest item = new InvoiceItemRequest("Precision Test", 1, exactPrice);
        CreateInvoiceRequest request = new CreateInvoiceRequest(501L, List.of(item));

        InvoiceResponse response = invoiceService.createDraft(request);

        assertThat(response.items().get(0).unitPrice()).isEqualByComparingTo(exactPrice);
        assertThat(response.items().get(0).lineTotal()).isEqualByComparingTo(exactPrice);
        assertThat(response.subtotal()).isEqualByComparingTo(exactPrice);
        assertThat(response.totalAmount()).isEqualByComparingTo(exactPrice);
        assertThat(response.balanceAmount()).isEqualByComparingTo(exactPrice);
    }

    @Test
    @DisplayName("26. Mutation operations acquire pessimistic lock via findByIdForUpdate")
    void testLockingPathUsedForMutations() {
        Invoice invoice = new Invoice("INV-LOCK-TEST", 601L, LocalDate.now());
        invoice.setId(4001L);
        invoice.setStatus(InvoiceStatus.DRAFT);
        InvoiceItem item = new InvoiceItem(invoice, "Item", 1, new BigDecimal("10.00"), new BigDecimal("10.00"));
        invoice.addItem(item);

        when(invoiceRepository.findByIdForUpdate(4001L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        // Test updateDraft uses findByIdForUpdate
        invoiceService.updateDraft(4001L, new UpdateDraftInvoiceRequest(List.of(), BigDecimal.ZERO, "note"));
        verify(invoiceRepository).findByIdForUpdate(4001L);

        // Test issueInvoice uses findByIdForUpdate
        invoice.addItem(item);
        invoiceService.issueInvoice(4001L);
        verify(invoiceRepository, org.mockito.Mockito.times(2)).findByIdForUpdate(4001L);
    }

    private Invoice createTestInvoice(Long id, InvoiceStatus status, BigDecimal total, BigDecimal paid, BigDecimal balance) {
        Invoice invoice = new Invoice("INV-2026-" + id, 100L, LocalDate.now());
        invoice.setId(id);
        invoice.setStatus(status);
        invoice.setSubtotal(total);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setBalanceAmount(balance);
        return invoice;
    }

    // -------------------------------------------------------------------------
    // Invoice Cancellation Tests (27 - 47)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("27. Cancel DRAFT invoice succeeds and returns CANCELLED response")
    void testCancelDraftInvoiceSucceeds() {
        Invoice invoice = createTestInvoice(27L, InvoiceStatus.DRAFT, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(27L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(27L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(27L);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("28. Cancel DRAFT invoice transitions entity status from DRAFT to CANCELLED")
    void testCancelDraftInvoiceTransitionsStatusToCancelled() {
        Invoice invoice = createTestInvoice(28L, InvoiceStatus.DRAFT, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(28L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(28L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(28L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("29. Cancel UNPAID invoice with zero active payments succeeds")
    void testCancelUnpaidInvoiceWithZeroActivePaymentsSucceeds() {
        Invoice invoice = createTestInvoice(29L, InvoiceStatus.UNPAID, new BigDecimal("150.00"), BigDecimal.ZERO, new BigDecimal("150.00"));
        when(invoiceRepository.findByIdForUpdate(29L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(29L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(29L);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("30. Cancel UNPAID invoice transitions entity status from UNPAID to CANCELLED")
    void testCancelUnpaidInvoiceTransitionsStatusToCancelled() {
        Invoice invoice = createTestInvoice(30L, InvoiceStatus.UNPAID, new BigDecimal("150.00"), BigDecimal.ZERO, new BigDecimal("150.00"));
        when(invoiceRepository.findByIdForUpdate(30L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(30L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(30L);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("31. Cancel PARTIALLY_PAID invoice with active recorded payments is rejected")
    void testCancelPartiallyPaidWithActivePaymentsRejected() {
        Invoice invoice = createTestInvoice(31L, InvoiceStatus.PARTIALLY_PAID, new BigDecimal("200.00"), new BigDecimal("50.00"), new BigDecimal("150.00"));
        when(invoiceRepository.findByIdForUpdate(31L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(31L)).thenReturn(new BigDecimal("50.00"));

        assertThatThrownBy(() -> invoiceService.cancelInvoice(31L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("active recorded payments remain");

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    @DisplayName("32. Cancel PAID invoice is rejected")
    void testCancelPaidInvoiceRejected() {
        Invoice invoice = createTestInvoice(32L, InvoiceStatus.PAID, new BigDecimal("100.00"), new BigDecimal("100.00"), BigDecimal.ZERO);
        when(invoiceRepository.findByIdForUpdate(32L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.cancelInvoice(32L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Paid invoices cannot be directly cancelled");

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PAID);
        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    @DisplayName("33. Cancel already CANCELLED invoice is rejected with InvalidInvoiceStatusException")
    void testCancelAlreadyCancelledInvoiceRejected() {
        Invoice invoice = createTestInvoice(33L, InvoiceStatus.CANCELLED, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(33L)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.cancelInvoice(33L))
                .isInstanceOf(InvalidInvoiceStatusException.class)
                .hasMessageContaining("Invoice is already cancelled");

        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    @DisplayName("34. Cancel missing invoice throws InvoiceNotFoundException")
    void testCancelMissingInvoiceThrowsNotFound() {
        when(invoiceRepository.findByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.cancelInvoice(999L))
                .isInstanceOf(InvoiceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("35. Authoritative PaymentRepository aggregate is checked during cancellation")
    void testAuthoritativePaymentRepositoryAggregateChecked() {
        Invoice invoice = createTestInvoice(35L, InvoiceStatus.UNPAID, new BigDecimal("80.00"), BigDecimal.ZERO, new BigDecimal("80.00"));
        when(invoiceRepository.findByIdForUpdate(35L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(35L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(35L);

        verify(paymentRepository).sumRecordedPaymentsByInvoiceId(35L);
    }

    @Test
    @DisplayName("36. REVERSED-only payment history does not block cancellation")
    void testReversedOnlyHistoryDoesNotBlockCancellation() {
        Invoice invoice = createTestInvoice(36L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));

        Payment originalReversed = new Payment(invoice, "REC-36-1", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now().minusDays(2), 1L);
        originalReversed.setId(361L);
        originalReversed.setStatus(PaymentStatus.REVERSED);

        Payment reversalComp = new Payment(invoice, "REC-36-REV", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now().minusDays(1), 1L);
        reversalComp.setId(362L);
        reversalComp.setStatus(PaymentStatus.REVERSED);

        invoice.getPayments().add(originalReversed);
        invoice.getPayments().add(reversalComp);

        when(invoiceRepository.findByIdForUpdate(36L)).thenReturn(Optional.of(invoice));
        // Authoritative query sumRecordedPaymentsByInvoiceId only sums status='RECORDED', so it returns ZERO
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(36L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(36L);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
        assertThat(invoice.getPayments()).hasSize(2);
    }

    @Test
    @DisplayName("37. Cancellation uses pessimistic locking path findByIdForUpdate")
    void testPessimisticLockingUsedForCancellation() {
        Invoice invoice = createTestInvoice(37L, InvoiceStatus.DRAFT, new BigDecimal("50.00"), BigDecimal.ZERO, new BigDecimal("50.00"));
        when(invoiceRepository.findByIdForUpdate(37L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(37L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(37L);

        verify(invoiceRepository).findByIdForUpdate(37L);
    }

    @Test
    @DisplayName("38. Invoice number is strictly preserved across cancellation")
    void testInvoiceNumberPreservedOnCancellation() {
        Invoice invoice = createTestInvoice(38L, InvoiceStatus.UNPAID, new BigDecimal("120.00"), BigDecimal.ZERO, new BigDecimal("120.00"));
        String originalNumber = invoice.getInvoiceNumber();

        when(invoiceRepository.findByIdForUpdate(38L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(38L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(38L);

        assertThat(response.invoiceNumber()).isEqualTo(originalNumber);
        assertThat(invoice.getInvoiceNumber()).isEqualTo(originalNumber);
    }

    @Test
    @DisplayName("39. Invoice total and discount amounts are preserved on cancellation")
    void testInvoiceTotalPreservedOnCancellation() {
        Invoice invoice = createTestInvoice(39L, InvoiceStatus.UNPAID, new BigDecimal("200.00"), BigDecimal.ZERO, new BigDecimal("200.00"));
        invoice.setDiscountAmount(new BigDecimal("20.00"));
        invoice.setSubtotal(new BigDecimal("220.00"));

        when(invoiceRepository.findByIdForUpdate(39L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(39L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(39L);

        assertThat(response.subtotal()).isEqualByComparingTo(new BigDecimal("220.00"));
        assertThat(response.discountAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(response.totalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
    }

    @Test
    @DisplayName("40. Invoice line items are preserved on cancellation")
    void testInvoiceItemsPreservedOnCancellation() {
        Invoice invoice = createTestInvoice(40L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        InvoiceItem item1 = new InvoiceItem(invoice, 501L, "Procedure 1", 1, new BigDecimal("60.00"), new BigDecimal("60.00"));
        InvoiceItem item2 = new InvoiceItem(invoice, 502L, "Procedure 2", 1, new BigDecimal("40.00"), new BigDecimal("40.00"));
        invoice.addItem(item1);
        invoice.addItem(item2);

        when(invoiceRepository.findByIdForUpdate(40L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(40L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(40L);

        assertThat(response.items()).hasSize(2);
        assertThat(invoice.getItems()).hasSize(2);
    }

    @Test
    @DisplayName("41. Payment history is not deleted and PaymentRepository delete is never called")
    void testPaymentHistoryNotDeletedAndNoDeleteOperations() {
        Invoice invoice = createTestInvoice(41L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        Payment reversedPayment = new Payment(invoice, "REC-41-REV", new BigDecimal("100.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        reversedPayment.setStatus(PaymentStatus.REVERSED);
        invoice.getPayments().add(reversedPayment);

        when(invoiceRepository.findByIdForUpdate(41L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(41L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(41L);

        assertThat(invoice.getPayments()).hasSize(1);
        assertThat(invoice.getPayments().get(0)).isSameAs(reversedPayment);
        // Verify payment repository was not invoked for any deletion
        verify(paymentRepository, never()).deleteAll(any());
        verify(paymentRepository, never()).delete(any());
        verify(paymentRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("42. Successful cancellation does not create payment or reversal rows")
    void testSuccessfulCancellationDoesNotCreatePaymentOrReversalRows() {
        Invoice invoice = createTestInvoice(42L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(42L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        invoiceService.cancelInvoice(42L);

        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    @DisplayName("43. Failure before save does not partially mutate persisted state")
    void testFailureBeforeSaveDoesNotPartiallyMutatePersistedState() {
        Invoice invoice = createTestInvoice(43L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(43L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(43L)).thenThrow(new RuntimeException("Database error during payment check"));

        assertThatThrownBy(() -> invoiceService.cancelInvoice(43L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database error during payment check");

        verify(invoiceRepository, never()).save(any(Invoice.class));
    }

    @Test
    @DisplayName("44. Cancelled invoice remains retrievable and mappable via getInvoice")
    void testCancelledInvoiceRemainsRetrievableAndMappable() {
        Invoice invoice = createTestInvoice(44L, InvoiceStatus.CANCELLED, new BigDecimal("100.00"), BigDecimal.ZERO, new BigDecimal("100.00"));
        when(invoiceRepository.findById(44L)).thenReturn(Optional.of(invoice));

        InvoiceResponse response = invoiceService.getInvoice(44L);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    @DisplayName("45. BigDecimal financial fields remain numerically unchanged on cancellation")
    void testBigDecimalFinancialFieldsRemainNumericallyUnchanged() {
        BigDecimal total = new BigDecimal("123.456");
        Invoice invoice = createTestInvoice(45L, InvoiceStatus.UNPAID, total, BigDecimal.ZERO, total);

        when(invoiceRepository.findByIdForUpdate(45L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(45L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(45L);

        assertThat(response.subtotal()).isEqualByComparingTo(total);
        assertThat(response.totalAmount()).isEqualByComparingTo(total);
        assertThat(response.balanceAmount()).isEqualByComparingTo(total);
        assertThat(response.paidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("46. Cancel with null invoiceId throws BillingValidationException")
    void testCancelNullInvoiceIdThrowsValidation() {
        assertThatThrownBy(() -> invoiceService.cancelInvoice(null))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Invoice ID is required");
    }

    @Test
    @DisplayName("47. Stale paidAmount reconciled when authoritative payment sum is zero")
    void testStalePaidAmountReconciledWhenAuthoritativePaymentSumZero() {
        Invoice invoice = createTestInvoice(47L, InvoiceStatus.UNPAID, new BigDecimal("100.00"), new BigDecimal("25.00"), new BigDecimal("75.00"));

        when(invoiceRepository.findByIdForUpdate(47L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.sumRecordedPaymentsByInvoiceId(47L)).thenReturn(BigDecimal.ZERO);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        InvoiceResponse response = invoiceService.cancelInvoice(47L);

        assertThat(response.paidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.balanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
    }
}
