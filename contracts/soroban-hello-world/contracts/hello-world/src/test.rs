#![cfg(test)]

use super::*;
use soroban_sdk::{vec, Env, String};

#[test]
contract.swap(
    &a,
    &b,
    &token_a.address,
    &token_b.address,
    &1000,
    &4500,
    &5000,
    &950,
);

assert_eq!(
    env.auths(),
    std::vec![
        (
            a.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract.address.clone(),
                    symbol_short!("swap"),
                    (
                        token_a.address.clone(),
                        token_b.address.clone(),
                        1000_i128,
                        4500_i128
                    )
                        .into_val(&env),
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token_a.address.clone(),
                        symbol_short!("transfer"),
                        (a.clone(), contract.address.clone(), 1000_i128,).into_val(&env),
                    )),
                    sub_invocations: std::vec![]
                }]
            }
        ),
        (
            b.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract.address.clone(),
                    symbol_short!("swap"),
                    (
                        token_b.address.clone(),
                        token_a.address.clone(),
                        5000_i128,
                        950_i128
                    )
                        .into_val(&env),
                )),
                sub_invocations: std::vec![AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        token_b.address.clone(),
                        symbol_short!("transfer"),
                        (b.clone(), contract.address.clone(), 5000_i128,).into_val(&env),
                    )),
                    sub_invocations: std::vec![]
                }]
            }
        ),
    ]
);