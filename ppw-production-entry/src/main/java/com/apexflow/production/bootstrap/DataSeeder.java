package com.apexflow.production.bootstrap;

import com.apexflow.production.user.Role;
import com.apexflow.production.user.User;
import com.apexflow.production.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedUsers(
            UserRepository repository,
            PasswordEncoder passwordEncoder
    ) {

        return args -> {

            if (repository.count() > 0) {
                return;
            }

            repository.save(
                    new User(
                            "operator1",
                            passwordEncoder.encode(
                                    "Operator@123"
                            ),
                            Role.OPERATOR,
                            "Operator One"
                    )
            );

            repository.save(
                    new User(
                            "operator2",
                            passwordEncoder.encode(
                                    "Operator@123"
                            ),
                            Role.OPERATOR,
                            "Operator Two"
                    )
            );

            repository.save(
                    new User(
                            "supervisor1",
                            passwordEncoder.encode(
                                    "Supervisor@123"
                            ),
                            Role.SUPERVISOR,
                            "Supervisor One"
                    )
            );

            repository.save(
                    new User(
                            "supervisor2",
                            passwordEncoder.encode(
                                    "Supervisor@123"
                            ),
                            Role.SUPERVISOR,
                            "Supervisor Two"
                    )
            );

            repository.save(
                    new User(
                            "manager1",
                            passwordEncoder.encode(
                                    "Manager@123"
                            ),
                            Role.MANAGER,
                            "Manager One"
                    )
            );

            repository.save(
                    new User(
                            "manager2",
                            passwordEncoder.encode(
                                    "Manager@123"
                            ),
                            Role.MANAGER,
                            "Manager Two"
                    )
            );
        };
    }
}