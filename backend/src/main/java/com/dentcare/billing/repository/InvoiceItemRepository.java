package com.dentcare.billing.repository;

import com.dentcare.billing.entity.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link InvoiceItem} entity (MF-05).
 */
@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {

    /**
     * Retrieves all itemized charges belonging to a specific invoice in insertion order.
     */
    List<InvoiceItem> findByInvoiceIdOrderByIdAsc(Long invoiceId);

    /**
     * Retrieves all invoice items associated with a specific clinical treatment procedure.
     */
    List<InvoiceItem> findByTreatmentProcedureId(Long treatmentProcedureId);
}
