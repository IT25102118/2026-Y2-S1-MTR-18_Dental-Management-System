package com.dentcare.billing.service;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceItemRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.mapper.BillingMapper;
import com.dentcare.billing.repository.InvoiceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

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
}
