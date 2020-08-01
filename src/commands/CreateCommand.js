#!/usr/bin/env node
const path = require('path');
const ora = require('ora');
const fs = require('fs-extra');
const download = require('download-git-repo');
const { copyFiles, parseCmdParams, getGitUser, runCmd, log } = require('../utils');
const { exit } = require('process');
const inquirer = require('inquirer');
const { InquirerConfig, RepoPath } = require('../utils/config');
const CFonts = require('cfonts');
const chalk = require('chalk')



/**
 * class 项目创建命令
 *
 * @description
 * @param {} source 用户提供的文件夹名称
 * @param {} destination 用户输入的create命令的参数
 */
class Creator {
    constructor(source, destination, ops = {}) {
        this.source = source
        this.cmdParams = parseCmdParams(destination)
        this.RepoMaps = Object.assign({
            repo: RepoPath,
            temp: path.join(__dirname, '../../__temp__'),
            target: this.genTargetPath(this.source)
        }, ops);
        this.gitUser = {}
        this.spinner = ora()
        this.init()
    }

    // 生成目标文件夹的绝对路径
    genTargetPath(relPath = 'vue-ts-template') {
        return path.resolve(process.cwd(), relPath);
    }

  

    // 初始化函数
    async init() {
        try {
            // 监测文件夹是否存在
            await this.checkFolderExist();
            // 用户选择分支并复制到目标项目目录下
            await this.getFrameBranchs();
            // 让用户输入目标项目的git地址，用于生成git信息
            await this.inputProjectGit();
            // 更新package.json文件
            await this.updatePkgFile();
        } catch (error) {
            console.log('')
            log.error(error);
            exit(1)
        } finally {
            this.spinner.stop();
        }
    }

    // 监测文件夹是否存在
    checkFolderExist() {
        CFonts.say('VT TEAM', {
            font: 'block',              // define the font face
            align: 'left',              // define text alignment
            colors: ['#ff8800'],         // define all colors
            background: 'transparent',  // define the background color, you can also use `backgroundColor` here as key
            letterSpacing: 1,           // define letter spacing
            lineHeight: 1,              // define the line height
            space: true,                // define if the output text should have empty lines on top and on the bottom
            maxLength: '0',             // define how many character can be on one line
        });
        return new Promise(async (resolve, reject) => {
            const { target } = this.RepoMaps
            // 如果create附加了--force或-f参数，则直接执行覆盖操作
            if (this.cmdParams.force) {
                await fs.removeSync(target)
                return resolve()
            }
            try {
                // 否则进行文件夹检查
                const isTarget = await fs.pathExistsSync(target)
                if (!isTarget) return resolve()

                const { recover } = await inquirer.prompt(InquirerConfig.folderExist);
                if (recover === 'cover') {
                    await fs.removeSync(target);
                    return resolve();
                } else if (recover === 'newFolder') {
                    const { inputNewName } = await inquirer.prompt(InquirerConfig.rename);
                    this.source = inputNewName;
                    this.RepoMaps.target = this.genTargetPath(`./${inputNewName}`);
                    return resolve();
                } else {
                    exit(1);
                }
            } catch (error) {
                log.error(`[vta]Error:${error}`)
                exit(1);
            }
        })
    }

    // 获取框架代码，用户选择分支并复制到目标项目目录下
    async getFrameBranchs () {
        let frameGitAddress = '';
        const { frameType } = await inquirer.prompt(InquirerConfig.frameList);
        if (frameType === 'pc') {
            frameGitAddress = 'git@git.vtstar.net:vt-microservice-platform/vtcloud-frontend/vcp-web.git'
            // frameGitAddress = 'git@github.com:qsjdhm/zymulinput.git'
        } else if (frameType === 'client') {
            frameGitAddress = 'github:qsjdhm/zymulinput'
        } else if (frameType === 'hybrid') {
            frameGitAddress = 'github:qsjdhm/zymulinput'
        }
        this.spinner.start('正在下载框架源代码...');
        const { repo, temp } = this.RepoMaps
        return new Promise(async (resolve, reject) => {
            await fs.removeSync(temp);
            // 将框架代码clone到__temp__目录下，通过.git目录获取框架代码分支版本信息
            await runCmd(`git clone --progress ${frameGitAddress} ${temp}`)
            try {
                await runCmd(`cd ${temp}`)
                process.chdir(temp);
                this.spinner.succeed('主分支源码下载成功');
                const list = await runCmd('git branch -a')
                // 过滤出有用的分支
                const usefulBranches = this.filterUsefulBranches(list.split('\n'))
                InquirerConfig.frameBranchs.choices = usefulBranches
                const { frameBranch } = await inquirer.prompt([{
                    type: 'list',
                    name: 'frameBranch',
                    message: '请选择想使用的分支：',
                    choices: usefulBranches
                }]);
                this.spinner.start('正在切换到'+frameBranch+'分支...');
                await runCmd(`git checkout -b ${frameBranch} origin/${frameBranch}`)
                this.spinner.succeed(frameBranch+'分支切换成功');
            } catch (error) {
                reject(error)
            } finally {
                resolve()
            }
        })
    }

    // 过滤出有用的分支
    filterUsefulBranches (list) {
        // 过滤无用的分支信息
        let branchList = []
        list.forEach(item => {
            let branchTemp = item.split('remotes/origin/')
            if (branchTemp.length > 1 && branchTemp[1].indexOf('HEAD ->') === -1) {
                branchList.push({name: branchTemp[1], value: branchTemp[1]})
            }
        })
        return branchList
    }

    // 让用户输入目标项目的git地址，用于生成git信息
    async inputProjectGit () {
        // 删除额外的资源文件
        const { inputGitAddress } = await inquirer.prompt({
            name: 'inputGitAddress',
            type: 'input',
            message: '请输入项目的GIT地址: '
        });
        // 创建目录，并克隆项目
        await fs.mkdir(this.RepoMaps.target)

        this.spinner.start('正在初始化项目...');
        await runCmd(`cd ${this.RepoMaps.target}`);
        process.chdir(this.RepoMaps.target);
        await runCmd(`git init`);
        const { temp, target } = this.RepoMaps
        await copyFiles(temp, target, ['./.git', './changelogs']);
        await fs.removeSync(this.RepoMaps.temp);
        this.spinner.succeed('项目初始化完成！');
        // chalk.green('项目初始化完成！');
        // this.spinner.start('正在将项目代码推送到master分支...');
        // await runCmd(`git add .`)
        // await runCmd(`git commit -m "init"`)
        // await runCmd(`git remote add origin ${inputGitAddress}`)
        // await runCmd(`git push origin master`)
        // this.spinner.succeed('项目代码推送完成！');
        // await fs.removeSync(temp);
    }

    // 更新package.json文件
    async updatePkgFile() {
        this.spinner.start('正在更新package.json...');
        const pkgPath = path.resolve(this.RepoMaps.target, 'package.json');
        const unnecessaryKey = ['keywords', 'license', 'files']
        const { name = '', email = '' } = await getGitUser();

        const jsonData = fs.readJsonSync(pkgPath);
        unnecessaryKey.forEach(key => delete jsonData[key]);
        Object.assign(jsonData, {
            name: this.source,
            author: name && email ? `${name} ${email}` : '',
            provide: true,
            version: "1.0.0"
        });
        await fs.writeJsonSync(pkgPath, jsonData, { spaces: '\t' })
        this.spinner.succeed('package.json更新完成！');
    }

    

    // 安装依赖
    async runApp() {
        try {
            this.spinner.start('正在安装项目依赖文件，请稍后...');
            await runCmd(`npm install --registry=https://registry.npm.taobao.org`);
            await runCmd(`git add . && git commit -m"init: 初始化项目基本框架"`);
            this.spinner.succeed('依赖安装完成！');

            console.log('请运行如下命令启动项目吧：\n');
            log.success(`   cd ${this.source}`);
            log.success(`   npm run serve`);
        } catch (error) {
            console.log('项目安装失败，请运行如下命令手动安装：\n');
            log.success(`   cd ${this.source}`);
            log.success(`   npm run install`);
        }
    }
}

module.exports = Creator;
