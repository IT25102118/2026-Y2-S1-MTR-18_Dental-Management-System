package com.dentcare.billing.repository;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link Invoice} entity (MF-05).
 * Provides search and filtering queries for patient invoice history, status, and dates
 * while preserving complete financial history (cancelled and paid invoices remain queryable).
 */
@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /**
     * Finds an invoice by its unique business invoice number.
     */
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    /**
     * Checks if an invoice exists with the given invoice number.
     */
    boolean existsByInvoiceNumber(String invoiceNumber);

    /**
     * Retrieves an invoice by ID acquiring a pessimistic write lock for transactional
     * balance calculation and payment application.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    /**
     * Retrieves all invoices for a specific patient, ordered by invoice date descending (newest first).
     */
    List<Invoice> findByPatientIdOrderByInvoiceDateDescIdDesc(Long patientId);

    /**
     * Retrieves all invoices matching a specific lifecycle status, ordered by invoice date descending.
     */
    List<Invoice> findByStatusOrderByInvoiceDateDescIdDesc(InvoiceStatus status);

    /**
     * Retrieves all invoices for a specific patient matching a specific lifecycle status,
     * ordered by invoice date descending.
     */
    List<Invoice> findByPatientIdAndStatusOrderByInvoiceDateDescIdDesc(Long patientId, InvoiceStatus status);

    /**
     * Retrieves all invoices issued within an inclusive date range, ordered by invoice date descending.
     */
    List<Invoice> findByInvoiceDateBetweenOrderByInvoiceDateDescIdDesc(LocalDate startDate, LocalDate endDate);

    /**
     * Retrieves all invoices for a specific patient within an inclusive date range,
     * ordered by invoice date descending.
     */
    List<Invoice> findByPatientIdAndInvoiceDateBetweenOrderByInvoiceDateDescIdDesc(Long patientId, LocalDate startDate, LocalDate endDate);

    /**
     * Searches invoices matching optional filter criteria (patient ID, status, date range),
     * ordered by invoice date descending (newest first) and id descending.
     */
    @Query("SELECT i FROM Invoice i WHERE " +
           "(:patientId IS NULL OR i.patientId = :patientId) AND " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:startDate IS NULL OR i.invoiceDate >= :startDate) AND " +
           "(:endDate IS NULL OR i.invoiceDate <= :endDate) " +
           "ORDER BY i.invoiceDate DESC, i.id DESC")
    List<Invoice> searchInvoices(
            @Param("patientId") Long patientId,
            @Param("status") InvoiceStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
