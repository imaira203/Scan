const fs = require('fs');
const Web3 = require('web3');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/dist/hdkey');
const Wallet = require('ethereumjs-wallet');
const util = require('ethereumjs-util');
const axios = require('axios');
const os = require('os');
const osUtils = require('os-utils');

// Khởi tạo danh sách các RPC server
const providers = ['https://bsc-mainnet.public.blastapi.io','https://bnb.api.onfinality.io/public','https://rpc-bsc.48.club','https://1rpc.io/bnb','https://bsc-mainnet.nodereal.io/v1/e97c5e12eac44ea9a03145fc82326730','https://binance.nodereal.io','https://rpc.ankr.com/bsc','https://bsc.blockpi.network/v1/rpc/public', 'https://bsc-dataseed1.binance.org', 'https://bsc-dataseed2.binance.org','https://bsc-dataseed2.defibit.io','https://bsc-dataseed1.ninicoin.io','https://bsc-dataseed.binance.org','https://bsc.publicnode.com','https://bscrpc.com','https://bsc-dataseed3.defibit.io'];

// Biến lưu chỉ số RPC server đang được sử dụng
let currentProviderIndex = 0;

// Tạo web3 object sử dụng RPC server đầu tiên trong danh sách
let web3 = new Web3(new Web3.providers.HttpProvider(providers[currentProviderIndex]));

// Số lượng ví cần tạo và quét
const numWallets = 10;

// Biến đếm số ví đã quét
let scannedWallets = 0;

// Số dư ban đầu
let totalBalance = 0;

// Biến để lưu thời điểm bắt đầu chạy
let startTime;

// Biến để lưu số ví đã quét trong giây hiện tại
let scannedWalletsPerSecond = 0;


// Tạo và quét ví
const createAndScanWallets = () => {
  // Mảng để lưu số dư của các ví được tạo ra
  const balances = [];

    // Lưu thời điểm bắt đầu chạy
    startTime = new Date();

  for (let i = 0; i < numWallets; i++) {
    // Tạo mnemonic
    const mnemonic = bip39.generateMnemonic();

    // Tạo wallet từ mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const hdWallet = Wallet.hdkey.fromMasterSeed(seed);
    const wallet = hdWallet.derivePath(`m/44'/60'/0'/0/${i}`).getWallet();

    // Lấy địa chỉ của wallet
    const address = '0x' + wallet.getAddress().toString('hex');

    // Lấy số dư của wallet
    web3.eth.getBalance(address, (err, balance) => {

      // Update số dư
      const updateTotalBalance = () => {
        totalBalance = balances.reduce((sum, b) => sum + Number(b.balance), 0);
      };  
       
      if (err) {
        console.error(err);
        // Thay đổi provider nếu gặp lỗi
        currentProviderIndex = (currentProviderIndex + 1) % providers.length;
        console.log("\x1b[32m",`Đang thay đổi provider. Provider mới: ${providers[currentProviderIndex]}`);
        web3.setProvider(new Web3.providers.HttpProvider(providers[currentProviderIndex]));
      } else {
        console.log("\x1b[32m",`Địa chỉ: ${address}, số dư: ${balance}`);

        if (balance != '0') {
          // Lấy private key và seed phrase
          const privateKey = wallet.getPrivateKey().toString('hex');
          const seedPhrase = mnemonic;

          // Thêm vào mảng số dư
          balances.push({ address, balance, privateKey, seedPhrase });
        }

        // Tăng số ví đã quét
        scannedWallets++;
        scannedWalletsPerSecond++;
        updateTotalBalance();     

                // Nếu đã quét xong tất cả các ví thì ghi mảng vào file txt
                if (balances.length === numWallets) {
                    const nonZeroBalances = balances.filter(b => b.balance != '0');
                    const output = nonZeroBalances.map(b => `${b.address}: ${b.balance}, private key: ${b.privateKey}, seed phrase: ${b.seedPhrase}`).join('\n');
                    fs.writeFile('balances.txt', output + '\n', {flag: 'a'}, err => {
                      if (err) {
                        console.error(err);
                      } else {
                        console.log("\x1b[32m",'Đã ghi mảng số dư vào file txt');
                      }
                    });
                  }
                }
              });
            }
          }

// Hiển thị thông tin trên Command Prompt
setInterval(() => {
  osUtils.cpuUsage((cpuUsage) => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercentage = (usedMemory / totalMemory) * 100;

    const currentTime = new Date();
    const elapsedTime = (currentTime - startTime) / 1000;
    const scanRate = scannedWalletsPerSecond / elapsedTime;
    scannedWalletsPerSecond = 0;
    process.title = `CPU: ${(cpuUsage * 100).toFixed(2)}%, RAM: ${memoryUsagePercentage.toFixed(2)}%, Số lượng ví đã quét: ${scannedWallets}, Tốc độ quét: ${scanRate.toFixed(2)} ví/giây, Tổng số dư đã quét: ${totalBalance}`;
  });
}, 100);

// Thực hiện quét liên tục sau mỗi 10 giây
    setInterval(() => {
      createAndScanWallets();
    }, 100);
          
// Thực hiện quét lần đầu tiên
    createAndScanWallets();
          