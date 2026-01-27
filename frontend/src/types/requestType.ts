export enum RequestType {
    RESCHEDULE = 'RESCHEDULE',
    CANCEL = 'CANCEL',
    SWAP = 'SWAP',
    ROOM_CHANGE = 'ROOM_CHANGE'
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
    [RequestType.RESCHEDULE]: 'Đổi lịch',
    [RequestType.CANCEL]: 'Hủy buổi học',
    [RequestType.SWAP]: 'Đổi slot với giảng viên khác',
    [RequestType.ROOM_CHANGE]: 'Đổi phòng'
};
