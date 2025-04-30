#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address};
use soroban_sdk::token::Client;
use soroban_sdk::IntoVal;

#[contract]
pub struct TokenExchangeContract;

#[contractimpl]
impl TokenExchangeContract {
    pub fn execute_swap(
        env: Env,
        sender: Address,
        receiver: Address,
        first_token: Address,
        second_token: Address,
        first_amount: i128,
        min_second_amount: i128,
        second_amount: i128,
        min_first_amount: i128,
    ) {
        if second_amount < min_second_amount {
            panic!("insufficient second token amount");
        }
        if first_amount < min_first_amount {
            panic!("insufficient first token amount");
        }
        
        sender.require_auth_for_args(
            (first_token.clone(), second_token.clone(), first_amount, min_second_amount).into_val(&env),
        );
        receiver.require_auth_for_args(
            (second_token.clone(), first_token.clone(), second_amount, min_first_amount).into_val(&env),
        );
        
        transfer_tokens(&env, &first_token, &sender, &receiver, first_amount, min_first_amount);
        transfer_tokens(&env, &second_token, &receiver, &sender, second_amount, min_second_amount);
    }
}

fn transfer_tokens(
    env: &Env,
    token_addr: &Address,
    source: &Address,
    destination: &Address,
    total_amount: i128,
    exchange_amount: i128,
) {
    let token_client = Client::new(env, token_addr);
    let current_contract = env.current_contract_address();
    
    token_client.transfer(source, &current_contract, &total_amount);
    token_client.transfer(&current_contract, destination, &exchange_amount);
    
    let refund = &total_amount - &exchange_amount;
    token_client.transfer(&current_contract, source, &refund);
}