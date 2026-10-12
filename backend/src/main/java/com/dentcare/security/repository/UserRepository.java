package com.dentcare.security.repository;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for persistent User accounts.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByRole(Role role);

    List<User> findByRole(Role role);

    List<User> findByActiveTrue();

    /**
     * Retrieves a User entity by ID acquiring a pessimistic write lock (FOR UPDATE).
     * Enforces the USER ROW FIRST locking stage for atomic profile and phone verification updates.
     *
     * @param id user identifier
     * @return optional containing the locked User entity if found
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
