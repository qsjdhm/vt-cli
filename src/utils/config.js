exports.InquirerConfig = {
    // 文件夹已存在的名称的询问参数
    folderExist: [{
        type: 'list',
        name: 'recover',
        message: '当前文件夹已存在，请选择操作：',
        choices: [
            { name: '创建一个新的文件夹', value: 'newFolder' },
            { name: '覆盖', value: 'cover' },
            { name: '退出', value: 'exit' },
        ]
    }],
    // 重命名的询问参数
    rename: [{
        name: 'inputNewName',
        type: 'input',
        message: '请输入新的项目名称: '
    }],
    // 文件夹已存在的名称的询问参数
    frameList: [{
        type: 'list',
        name: 'frameType',
        message: '请选择框架类型：',
        choices: [
            { name: 'PC端', value: 'pc' },
            { name: '现场客户端', value: 'client' },
            { name: '移动端', value: 'hybrid' },
        ]
    }],
    // 框架分支列表
    frameBranchs: [{
        type: 'list',
        name: 'frameBranch',
        message: '请选择框架分支版本：',
        choices: []
    }],
    // 目标项目的git地址询问参数
    gitAddress: [{
        name: 'inputGitAddress',
        type: 'input',
        message: '请输入项目的GIT地址: '
    }],
}

// 远程Repo地址
exports.RepoPath = 'github:qsjdhm/zymulinput'
