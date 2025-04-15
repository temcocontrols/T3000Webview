
import moment from 'moment';
import { useIntl } from '@umijs/max';

export const dateCurrent = () => {
    return Date.now().toString();
}

export const dateFormat = (dt?: any, foramt?: any) => {
    if (!dt) return '-';
    return foramt ? moment(dt).format(foramt) : moment(dt).format('YYYY-MM-DD HH:mm');
}

export const dateTimestamp = (dt?: any) => {
    var format = 'YYYYMMDDHHmmss';
    return !dt ? moment(new Date()).format(format) : moment(dt).format(format);
}

export const titleOpt = (field: any) => {
    return useIntl().formatMessage({ id: field });
}

export const transferToEmpty = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, value === undefined ? '' : value])
    );
}

export const transferToNull = (obj: any) => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, value === '' ? null : value])
    );
}