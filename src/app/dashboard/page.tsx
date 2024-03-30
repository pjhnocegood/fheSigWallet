import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import dayjs from 'dayjs';

import { config } from '@/config';
import {CustomersTable, FheTransaction} from '@/components/dashboard/customer/customers-table';
import type { Customer } from '@/components/dashboard/customer/customers-table';

export const metadata = { title: `Customers | Dashboard | ${config.site.name}` } satisfies Metadata;

const customers = [
    {
        nonce: 0,
        name: 'Alcides Antonio',
        avatar: '/assets/avatar-10.png',
        email: 'alcides.antonio@devias.io',
        phone: '908-691-3242',
        address: { city: 'Madrid', country: 'Spain', state: 'Comunidad de Madrid', street: '4158 Hedge Street' },
        createdAt: dayjs().subtract(2, 'hours').toDate(),
    },
] satisfies FheTransaction[];

export default function Page(): React.JSX.Element {
    const page = 0;
    const rowsPerPage = 5;


    const paginatedCustomers = applyPagination(customers, page, rowsPerPage);

    return (
        <Stack spacing={3}>

            <CustomersTable
                count={paginatedCustomers.length}
                page={page}
                rows={paginatedCustomers}
                rowsPerPage={rowsPerPage}
            />
        </Stack>
    );
}

function applyPagination(rows: Customer[], page: number, rowsPerPage: number): Customer[] {
    return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
}
