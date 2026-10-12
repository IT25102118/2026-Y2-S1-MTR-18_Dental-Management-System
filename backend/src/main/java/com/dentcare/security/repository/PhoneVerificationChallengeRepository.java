package com.dentcare.security.repository;

import com.dentcare.security.entity.PhoneVerificationChallenge;
import com.dentcare.security.entity.PhoneVerificationChallengeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for PhoneVerificationChallenge entities.
 *
 * Provides persistence and query operations supporting per-user challenge lookup,
 * active challenge resolution, and per-user/per-phone rate-limit calculation.
 */
@Repository
public interface PhoneVerificationChallengeRepository extends JpaRepository<PhoneVerificationChallenge, Long> {

    /**
     * Outstanding challenge statuses eligible for supersession upon phone change.
     * Non-terminal statuses: CREATED, SUBMITTED, DELIVERY_UNCERTAIN.
     */
    List<PhoneVerificationChallengeStatus> OUTSTANDING_STATUSES = List.of(
            PhoneVerificationChallengeStatus.CREATED,
            PhoneVerificationChallengeStatus.SUBMITTED,
            PhoneVerificationChallengeStatus.DELIVERY_UNCERTAIN
    );

    /**
     * Finds a challenge by its identifier and associated user identifier.
     *
     * @param id challenge identifier
     * @param userId user identifier
     * @return optional challenge if found for the specified user
     */
    Optional<PhoneVerificationChallenge> findByIdAndUserId(Long id, Long userId);

    /**
     * Finds all challenges for a given user, ordered from newest to oldest.
     *
     * @param userId user identifier
     * @return list of challenges for the user
     */
    List<PhoneVerificationChallenge> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Finds challenges for a given user matching a specific status.
     *
     * @param userId user identifier
     * @param status challenge status
     * @return list of matching challenges
     */
    List<PhoneVerificationChallenge> findByUserIdAndStatus(Long userId, PhoneVerificationChallengeStatus status);

    /**
     * Finds the most recent challenge for a given user matching a specific status.
     *
     * @param userId user identifier
     * @param status challenge status
     * @return optional containing the latest matching challenge
     */
    Optional<PhoneVerificationChallenge> findFirstByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId,
            PhoneVerificationChallengeStatus status
    );

    /**
     * Counts the number of challenge requests issued for a user since a given cutoff timestamp.
     * Used for per-user request rate-limiting calculations.
     *
     * @param userId user identifier
     * @param cutoff cutoff timestamp
     * @return count of challenges created after the cutoff
     */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime cutoff);

    /**
     * Counts the number of challenge requests issued for a normalized phone snapshot since a cutoff timestamp.
     * Used for per-destination-phone request rate-limiting calculations.
     *
     * @param phoneSnapshot normalized E.164 phone number
     * @param cutoff cutoff timestamp
     * @return count of challenges created after the cutoff
     */
    long countByPhoneSnapshotAndCreatedAtAfter(String phoneSnapshot, LocalDateTime cutoff);

    /**
     * Retrieves outstanding challenges for a user acquiring a pessimistic write lock.
     * Enforces the CHALLENGE ROWS SECOND locking stage after the User lock is held.
     * Challenges are ordered by ID ascending to guarantee consistent lock acquisition order.
     *
     * @param userId user identifier
     * @param statuses collection of outstanding statuses
     * @return list of locked outstanding challenges
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM PhoneVerificationChallenge c " +
           "WHERE c.user.id = :userId AND c.status IN :statuses " +
           "ORDER BY c.id ASC")
    List<PhoneVerificationChallenge> findByUserIdAndStatusInForUpdate(
            @Param("userId") Long userId,
            @Param("statuses") Collection<PhoneVerificationChallengeStatus> statuses
    );

    /**
     * Non-locking lookup of challenges for a user by status collection.
     *
     * @param userId user identifier
     * @param statuses collection of statuses
     * @return list of challenges matching the specified statuses
     */
    List<PhoneVerificationChallenge> findByUserIdAndStatusIn(
            Long userId,
            Collection<PhoneVerificationChallengeStatus> statuses
    );
}
