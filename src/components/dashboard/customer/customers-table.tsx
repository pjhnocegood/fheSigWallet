'use client';

import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';

import { useSelection } from '@/hooks/use-selection';
import Button from "@mui/material/Button";
import {Modal} from "@mui/base";
import {useEffect, useState} from "react";
import {TextField} from "@mui/material";
import {ethers} from "ethers";
import FhwWalletContract from "@/contract/FheMultiSig.json";
import StorageLib from "@/lib/storage/storageLib";
import {router} from "next/client";
import {useRouter} from "next/navigation";
import {createFheInstance} from "@/lib/storage/instance";
import {EncryptionTypes} from "fhenixjs";
import LoadingSpinner from "@/components/core/lodingBar";

function noop(): void {
  // do nothing
}

export interface Customer {
  id: string;
  avatar: string;
  name: string;
  email: string;
  address: { city: string; state: string; country: string; street: string };
  phone: string;
  createdAt: Date;
}

export interface FheTransaction {
  nonce: number;
  to: string;
  value: string;
  executed: boolean;
  finalized: boolean;
  voteNumber: number;
  confirmed: boolean;
  votingResult: string;
}

interface CustomersTableProps {
  count?: number;
  page?: number;
  rowsPerPage?: number;
}

export function CustomersTable({
  count = 0,
  page = 0,
  rowsPerPage = 0,
}: CustomersTableProps): React.JSX.Element {



  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<FheTransaction[]>([]); // FheTransaction[]
  const [contractBalance, setContractBalance] = useState(""); // FheTransaction[]
  const [executeThreshold, setExecuteThreshold] = useState(""); // FheTransaction[]
  const [voteThreshold, setVoteThreshold] = useState(""); // FheTransaction[]
  const [owners, setOwners] = useState(""); // FheTransaction[]


  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [loading, setLoading] = useState(false); // 항상 로딩 바를 보이도록 초기값을 false 설정

  const [address, setAddress] = useState('');
  const router = useRouter();
  useEffect(() => {
    getTransactionData();
    if (typeof window.ethereum !== 'undefined') {
      // MetaMask가 설치되어 있고 사용 가능한 경우

      // 현재 계정 정보 가져오기 예시
      var currentAccount = ethereum.selectedAddress;

      // 계정 변경 이벤트 감지
      window.ethereum.on('accountsChanged', function (accounts) {
        // 새로운 계정 정보를 가져옴
        var newAccount = accounts[0];
        getTransactionData();
        // 새로운 계정 정보를 처리하는 코드 추가
      });

    } else {
      // MetaMask가 설치되어 있지 않거나 사용 불가능한 경우
      console.log('MetaMask를 설치하거나 사용 가능한 상태가 아닙니다.');
    }
  },[]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

   async function getTransactionData(){
    // const contractAddress = StorageLib.loadData('contractAddress') as string;
    // const provider = new ethers.providers.Web3Provider(window.ethereum);
    // const contractABI = FhwWalletContract.abi;
    // const signer = provider.getSigner();
    // const contract = new ethers.Contract(contractAddress, contractABI, signer);
    // const transactions = contract.getTransactions();
     const provider = new ethers.providers.Web3Provider(window.ethereum);
     const accounts = await provider.listAccounts();
     console.log('accounts :',accounts)
     connectMetaMaskAndCallContract("read","getFheTransactions",accounts[0]).then((tx)=>{
      const fheTransactions : FheTransaction[] = [];
      for (let i = 0; i < tx[0].length; i++) {
        const etherValue = ethers.utils.formatEther(tx[0][i].value);
        let votingResult = "Ready";
        if(tx[0][i].votingResult.toString()=="1"){
            votingResult="Fail"
        }else if(tx[0][i].votingResult.toString()=="2"){
            votingResult="Success"
        }
        const fheTransaction = {
          nonce: i,
          to: tx[0][i].to,
          value: etherValue.toString(),
          executed: tx[0][i].executed.toString(),
          finalized: tx[0][i].finalized.toString(),
          voteNumber: tx[0][i].voteNumber.toString(),
          votingResult: votingResult,
          confirmed: tx[2][i].toString(),
        }
        fheTransactions.push(fheTransaction);
      }
      console.log('fheTransactions :',fheTransactions)
      //alert('aa')
      setRows(fheTransactions);
      setOwners(tx[1].toString());
      setVoteThreshold(tx[3].toString());
      setExecuteThreshold(tx[4].toString());

      setContractBalance(ethers.utils.formatEther(tx[5]).toString());
    });
  }

  const handleSubmit = () => {
    console.log('Submitted values:', input1, input2);
    // 여기에 서브밋 로직을 추가하세요.
    const destination = input1;
    const value = ethers.utils.parseEther(input2).toString();
    connectMetaMaskAndCallContract("write","submitTransaction", destination, value,"0x");


    setOpen(false); // 모달 닫기
  };

  function execute(nonce:any){
    connectMetaMaskAndCallContract("write","executeTransaction",nonce);
  }

  async function vote(nonce:string,type:string){
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractAddress = StorageLib.loadData('contractAddress') as string;
    const instance = await createFheInstance(provider,contractAddress);

    if(type=="agree"){
      connectMetaMaskAndCallContract("write","confirmTransaction", nonce,await instance.encrypt_uint32(1));
    }else{
      connectMetaMaskAndCallContract("write","confirmTransaction",nonce, await instance.encrypt_uint32(0));
    }
  }

  function finalize(nonce:any){
    connectMetaMaskAndCallContract("write","finalize",nonce);
  }

  async function connectMetaMaskAndCallContract(type:string,functionName:string,...params:any[]) {
    // 이더리움 네트워크 연결 설정
    setLoading(true)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractABI = FhwWalletContract.abi;
    // MetaMask 권한 요청
    await window.ethereum.enable();

    // MetaMask로부터 서명을 받을 수 있는 Signer 생성
    const signer = provider.getSigner();

    // 컨트랙트 주소와 ABI
    const contractAddress = StorageLib.loadData('contractAddress') as string;

    // 컨트랙트 인스턴스 생성
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    console.log('params:',params)

    try {
      // 함수 호출 및 서명된 트랜잭션 전송
      const tx = await contract[functionName](...params);
      if(type=="write"){
        await tx.wait();
        await getTransactionData();

      }
      console.log('tx: ',tx)
      setLoading(false)
      return tx;

    } catch (error) {
      console.error("Error executing function:", error);
      setLoading(false)
    }
  }


  return (
    <Card>
      <Typography variant="subtitle1"  sx={{ paddingLeft: '20px' }} >
          ConTractAddress : {StorageLib.loadData('contractAddress')}
      </Typography>
      <Typography variant="subtitle1"  sx={{ paddingLeft: '20px' }} >
        ConTractBalance : {contractBalance}
      </Typography>
      <Typography variant="subtitle1"  sx={{ paddingLeft: '20px' }} >
        Owners : {owners}
      </Typography>
      <Typography variant="subtitle1"  sx={{ paddingLeft: '20px' }} >
        FinalizeThreshold : {voteThreshold}
      </Typography>
      <Typography variant="subtitle1"  sx={{ paddingLeft: '20px' }} >
        ExecuteThreshold : {executeThreshold}
      </Typography>
      <Box sx={{ p: 3 }}>
        <Button onClick={handleOpen}  container style={{ textAlign: 'right' }}>
          Propose Transaction
        </Button>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
            <h2 id="modal-modal-title">Propose Transaction</h2>
            <TextField
                label="destination"
                value={input1}
                onChange={(e) => setInput1(e.target.value)}
                fullWidth
                margin="normal"
            />
            <TextField
                label="value"
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                fullWidth
                margin="normal"
            />
            <Button onClick={handleSubmit} variant="contained">Submit</Button>
            <Button onClick={handleClose} variant="contained">Close Modal</Button>
          </Box>
        </Modal>
        <Table sx={{ minWidth: '800px' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" >Nonce</TableCell>
              <TableCell align="center" >Destination</TableCell>
              <TableCell align="center" >Value</TableCell>
              <TableCell align="center" >Vote</TableCell>
              <TableCell align="center" >VoteNumber</TableCell>
              <TableCell align="center" >Finalize</TableCell>
              <TableCell align="center" >Execute</TableCell>
              <TableCell align="center" >VotingResult</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {

              return (
                <TableRow hover key={row.nonce} >
                  <TableCell align="center">{row.nonce}</TableCell>
                  <TableCell align="center">{row.to}</TableCell>
                  <TableCell align="center">{row.value}</TableCell>
                  <TableCell align="center">
                    <Button onClick={() => vote(row.nonce,"agree") } disabled={row.confirmed=="true"} >Agree</Button>
                    <Button onClick={() => vote(row.nonce,"disAgree")} disabled={row.confirmed=="true"}>Disagree</Button></TableCell>
                  <TableCell align="center">{row.voteNumber}</TableCell>
                  <TableCell align="center"><Button onClick={() => finalize(row.nonce)} disabled={row.finalized=="true"} >Finalize</Button></TableCell>
                  <TableCell align="center"><Button onClick={() => execute(row.nonce)} disabled={row.executed=="true"}  >Execute</Button></TableCell>
                  <TableCell align="center">{row.votingResult}</TableCell>

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <Divider />

      {loading && <LoadingSpinner/> }
    </Card>
  );
}
