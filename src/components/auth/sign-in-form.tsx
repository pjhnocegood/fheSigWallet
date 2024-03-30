'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {  useForm } from 'react-hook-form';
import { z as zod } from 'zod';
import { ethers } from 'ethers';


import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';
import {useState} from "react";
import FhwWalletContract from '../../contract/FheMultiSig.json'
import StorageLib from "@/lib/storage/storageLib";
import {TextField} from "@mui/material";
import Box from "@mui/material/Box";
import {Modal} from "@mui/base";
import LoadingSpinner from "@/components/core/lodingBar";


const schema = zod.object({
  email: zod.string().min(1, { message: 'Email is required' }).email(),
  password: zod.string().min(1, { message: 'Password is required' }),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { email: 'sofia@devias.io', password: 'Secret1' } satisfies Values;

export function SignInForm(): React.JSX.Element {
    const router = useRouter();
  const [inputValue, setInputValue] = useState('');

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };
  const { checkSession } = useUser();
  const [deployedContract, setDeployedContract] = useState<string>(null);
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = React.useState<boolean>(false);
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  async function handleSubmit() {
   await authClient.signInWithPassword();
    await checkSession?.();

    // UserProvider, for this case, will not refresh the router
    // After refresh, GuestGuard will handle the redirect
    router.refresh();
  }

  const [provider, setProvider] = useState(null);
  const [connectedAddress, setConnectedAddress] = useState('');
  const [loading, setLoading] = useState(false); // 항상 로딩 바를 보이도록 초기값을 false 설정

  async function connectWallet() {
    try {
      // 요청할 이더리움 프로바이더를 선택합니다 (MetaMask 등).
      const ethereumProvider = window.ethereum;

      if (ethereumProvider) {
        // 이더리움 프로바이더를 사용하여 이더스 객체를 생성합니다.
        const ethProvider = new ethers.providers.Web3Provider(ethereumProvider);

        // 사용자에게 연결 요청을 보냅니다.
        await ethereumProvider.request({ method: 'eth_requestAccounts' });

        // 연결된 계정을 가져옵니다.
        const accounts = await ethProvider.listAccounts();

        // 상태를 업데이트합니다.
        setProvider(ethProvider);
        setConnectedAddress(accounts[0]);

        // 이벤트를 구독하여 연결 상태를 유지합니다.
        ethereumProvider.on('accountsChanged', async (newAccounts) => {
          setConnectedAddress(newAccounts[0]);
        });
      } else {
        throw new Error('이더리움 프로바이더를 찾을 수 없습니다. MetaMask와 같은 지갑을 설치해주세요.');
      }
    } catch (error) {
      console.error('지갑 연결 중 오류 발생:', error);
    }
  }
  function connectContract(){

    StorageLib.saveData('contractAddress', inputValue)
    handleSubmit();

  }

  async function deployContract() {
    setLoading(true)
    try {
      // 이더리움 프로바이더를 선택합니다 (MetaMask 등).
      const ethereumProvider = window.ethereum;

      if (ethereumProvider) {
        // 이더리움 프로바이더를 사용하여 이더스 객체를 생성합니다.
        const ethProvider = new ethers.providers.Web3Provider(ethereumProvider);

        // 사용자에게 연결 요청을 보냅니다.
        await ethereumProvider.request({ method: 'eth_requestAccounts' });

        // 계정을 가져옵니다.
        const signer = ethProvider.getSigner();

        // 생성자에 전달할 인자들을 설정합니다.
        const _owners = ['0x44453832355Ae808d12fda5406C05e0B569a6592']; // 지갑 주소 배열
        const _voteThreshold = 1; // 첫 번째 유니트 값
        const _executeThreshold = 1; // 두 번째 유니트 값

        // 컴파일된 스마트 계약의 ABI와 바이트코드를 가져옵니다.
        const contractABI = FhwWalletContract.abi;
        const contractBytecode = FhwWalletContract.bytecode;
        // 스마트 계약 인스턴스를 배포합니다.
        const factory = new ethers.ContractFactory(contractABI, contractBytecode, signer);
       // const contractDeployTx = contractFactory.getDeployTransaction(_owners, arg2, arg3);

        const deployedContract = await factory.deploy(input1.split(','), input2, input3);

        await deployedContract.deployed();
        console.log()
        // 스마트 계약 주소를 가져옵니다.
        const contractAddress = deployedContract.address;

        // 상태를 업데이트합니다.
          setDeployedContract(contractAddress)
          StorageLib.saveData('contractAddress', contractAddress)
        handleSubmit();
        setLoading(false)
        console.log('스마트 계약이 성공적으로 배포되었습니다. 주소:', contractAddress);
      } else {
        setLoading(false)
        throw new Error('이더리움 프로바이더를 찾을 수 없습니다. MetaMask와 같은 지갑을 설치해주세요.');
      }
    } catch (error) {
      setLoading(false)
      console.error('스마트 계약 배포 중 오류 발생:', error);
    }
  }


  return (
    <Stack spacing={4}>

      <form >
        <Stack spacing={4}>

          <div>
          </div>

          <Button size="large" disabled={isPending} onClick={handleOpen} variant="contained">
            Create Wallet
          </Button>


         <Stack textAlign="center">
           <Modal
               open={open}
               onClose={handleClose}
               aria-labelledby="modal-modal-title"
               aria-describedby="modal-modal-description"
           >
             <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
               <h2 id="modal-modal-title">FHE Wallet Infomation</h2>
               <TextField type={"text"}
                   label="owners"
                   value={input1}
                   onChange={(e) => setInput1(e.target.value)}
                   fullWidth
                   margin="normal"
               />
               <TextField type={"number"}
                   label="voteThreshold"
                   value={input2}
                   onChange={(e) => setInput2(e.target.value)}
                   fullWidth
                   margin="normal"
               />
               <TextField type={"number"}
                   label="executeThreshold"
                   value={input3}
                   onChange={(e) => setInput3(e.target.value)}
                   fullWidth
                   margin="normal"
               />
               <Button onClick={deployContract} variant="contained">Create Wallet</Button>
               <Button onClick={handleClose} variant="contained">Close Modal</Button>
             </Box>
           </Modal>
           OR
         </Stack>

          <TextField
              label="contractAddress"
              value={inputValue}
              onChange={handleChange}
              variant="outlined"
          />
          <Button size="large" disabled={isPending} onClick={connectContract} variant="contained">
            Connect
          </Button>
          {loading && <LoadingSpinner/> }
        </Stack>
      </form>
    </Stack>
  );
}
